import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChessEngine } from '@/hooks/useChessEngine';
import { useTimer } from '@/hooks/useTimer';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import type { BoardInfo, LastMoveInfo, PieceColor, MoveHistoryEntry } from '@/hooks/useChessEngine';
const LazyChessPieceSVG = React.lazy(() =>
  import('@/components/ChessPieces').then((m) => ({ default: m.ChessPieceSVG }))
);

function ChessPiece(props: React.ComponentProps<typeof LazyChessPieceSVG>) {
  return (
    <React.Suspense fallback={null}>
      <LazyChessPieceSVG {...props} />
    </React.Suspense>
  );
}

const SQUARE_SIZE = 64;

const START_COUNTS: Record<string, number> = { queen: 1, rook: 2, bishop: 2, knight: 2, pawn: 8 };

const TIME_OPTIONS = [
  { label: '1m', seconds: 60 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
];
const PROMO_PIECES: {
  kind: 'queen' | 'rook' | 'bishop' | 'knight';
  label: string;
  index: number;
}[] = [
  { kind: 'queen', label: 'Queen', index: 0 },
  { kind: 'rook', label: 'Rook', index: 1 },
  { kind: 'bishop', label: 'Bishop', index: 2 },
  { kind: 'knight', label: 'Knight', index: 3 },
];

// ── Stable piece ID tracker ──────────────────────────────────────────────────
// Gives each physical piece a stable UUID so Framer Motion can animate it
// sliding from square to square (including castling rook + king simultaneously).
function usePieceIds(board: BoardInfo | null, lastMove: LastMoveInfo | null) {
  const idMapRef = useRef<Map<number, string>>(new Map()); // sq → stable id
  const counterRef = useRef(0);
  const prevMoveRef = useRef<LastMoveInfo | null>(null);

  const newId = () => `p${counterRef.current++}`;

  const getMap = () => idMapRef.current;

  // Initialize / re-initialize on new game (detected by board having all 32 pieces back)
  const boardHash = board?.pieces.length ?? 0;
  const didInit = useRef(false);

  if (!didInit.current && board) {
    for (const p of board.pieces) {
      idMapRef.current.set(p.square, newId());
    }
    didInit.current = true;
  }

  // Update IDs whenever lastMove changes (a move was made)
  if (lastMove !== prevMoveRef.current && lastMove !== null) {
    prevMoveRef.current = lastMove;
    const m = lastMove;
    const map = idMapRef.current;

    // Remove any piece that was captured on the destination
    // (but only if it's NOT en passant — en passant capture is on a different sq)
    if (!m.is_en_passant) map.delete(m.to);

    // Move the piece's ID from → to
    const movingId = map.get(m.from) ?? newId();
    map.delete(m.from);
    map.set(m.to, movingId);

    // Castling: also move the rook
    if (m.is_castling) {
      const rookFrom = m.to === 6 ? 7 : m.to === 2 ? 0 : m.to === 62 ? 63 : 56;
      const rookTo = m.to === 6 ? 5 : m.to === 2 ? 3 : m.to === 62 ? 61 : 59;
      const rookId = map.get(rookFrom) ?? newId();
      map.delete(rookFrom);
      map.set(rookTo, rookId);
    }

    // En passant: remove captured pawn (it's on a different square)
    if (m.is_en_passant && board) {
      const dir = board.pieces.find((p) => p.square === m.to)?.color === 'white' ? -1 : 1;
      const capSq = m.to + dir * 8;
      map.delete(capSq);
    }

    // Ensure any new pieces (promotion) have IDs
    if (board) {
      for (const p of board.pieces) {
        if (!map.has(p.square)) map.set(p.square, newId());
      }
    }
  }

  // On reset (board hash goes back to 32), re-init
  useEffect(() => {
    if (boardHash === 32) {
      idMapRef.current.clear();
      counterRef.current = 0;
      prevMoveRef.current = null;
      if (board) {
        for (const p of board.pieces) {
          idMapRef.current.set(p.square, newId());
        }
      }
    }
  }, [boardHash]);

  return getMap;
}

// ── Player panel ─────────────────────────────────────────────────────────────
function PlayerPanel({
  color,
  time,
  isActive,
  inCheck,
}: {
  color: PieceColor;
  time: string;
  isActive: boolean;
  inCheck: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 transition-all duration-200 bg-[#161b22] border-2 ${isActive ? 'border-[#f0c060] shadow-[0_0_24px_rgba(240,192,96,0.14)]' : 'border-[#21262d]'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`w-4 h-4 rounded-full ${color === 'white' ? 'piece-circle-white' : 'piece-circle-black'}`}
        />
        <span className="text-xs font-semibold capitalize text-[#8b949e]">{color}</span>
        <AnimatePresence>
          {inCheck && (
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full check-pill"
            >
              CHECK
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <motion.div
        key={time}
        animate={
          isActive && parseInt(time.split(':')[0]) === 0 && parseInt(time.split(':')[1]) < 10
            ? {
                color: ['#ef4444', '#f0c060', '#ef4444'],
                transition: { repeat: Infinity, duration: 1 },
              }
            : {}
        }
        className={`text-3xl font-mono font-bold tracking-wider ${isActive ? 'text-amber' : 'text-[#374151]'}`}
      >
        {time}
      </motion.div>
    </div>
  );
}

function CapturedDisplay({
  board,
  capturedColor,
}: {
  board: BoardInfo;
  capturedColor: PieceColor;
}) {
  const kinds = ['queen', 'rook', 'bishop', 'knight', 'pawn'] as const;
  const captured: string[] = [];
  for (const kind of kinds) {
    const remaining = board.pieces.filter(
      (p) => p.color === capturedColor && p.kind === kind
    ).length;
    for (let i = remaining; i < START_COUNTS[kind]; i++) captured.push(kind);
  }
  return (
    <div className="flex flex-wrap gap-0.5 min-h-[22px] items-center">
      {captured.map((kind, i) => (
        <motion.span
          key={`${kind}-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center leading-none opacity-85"
        >
          <ChessPiece color={capturedColor} kind={kind} size={18} />
        </motion.span>
      ))}
      {captured.length === 0 && <span className="text-xs text-[#21262d]">—</span>}
    </div>
  );
}

// ── Move history panel ────────────────────────────────────────────────────────
function MoveHistoryPanel({
  moves,
  lastMoveIdx,
}: {
  moves: MoveHistoryEntry[];
  lastMoveIdx: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [moves.length]);

  // Group into pairs: [[white, black?], ...]
  const pairs: Array<[MoveHistoryEntry, MoveHistoryEntry | null]> = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push([moves[i], moves[i + 1] ?? null]);
  }

  return (
    <div className="rounded-xl overflow-hidden bg-panel min-w-0">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-[#21262d]">
        <span className="text-xs uppercase tracking-wider font-semibold text-muted-d">Moves</span>
        <span className="text-xs ml-auto font-mono text-muted-d">
          {moves.length === 0 ? '—' : `${Math.ceil(moves.length / 2)} / ${moves.length}`}
        </span>
      </div>
      <div ref={scrollRef} className="overflow-y-auto max-h-[192px]">
        {pairs.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-d">No moves yet</div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <tbody>
              {pairs.map(([white, black], i) => {
                const wIdx = i * 2;
                const bIdx = i * 2 + 1;
                return (
                  <tr key={i} className="border-b border-[#21262d]">
                    <td className="px-2 py-1.5 font-medium select-none text-muted-d w-7">
                      {white.moveNumber}.
                    </td>
                    <td
                      className={`px-2 py-1.5 font-mono font-semibold rounded ${wIdx === lastMoveIdx ? 'text-amber bg-[rgba(240,192,96,0.08)]' : 'text-[#c9d1d9]'} w-[46%]`}
                    >
                      {white.san}
                    </td>
                    <td
                      className={`px-2 py-1.5 font-mono font-semibold rounded ${black && bIdx === lastMoveIdx ? 'text-amber bg-[rgba(240,192,96,0.08)]' : 'text-[#c9d1d9]'} w-[46%]`}
                    >
                      {black?.san ?? ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ChessGamePage() {
  const {
    board,
    selectedSquare,
    validMoves,
    lastMove,
    promotionPending,
    moveHistory,
    selectSquare,
    confirmPromotion,
    resetGame,
    undoMove,
  } = useChessEngine();

  const [gameStarted, setGameStarted] = useState(false);
  const [selectedTime, setSelectedTime] = useState(600);
  const [flipped, setFlipped] = useState(false);
  const [moveCount, setMoveCount] = useState(0);

  const activeColor: PieceColor | null =
    gameStarted && board.status === 'playing' ? board.turn : null;
  const { times, reset: resetTimers, formatTime } = useTimer(selectedTime, activeColor);

  const getPieceIds = usePieceIds(board, lastMove);

  // ── Drag state ──────────────────────────────────────────────────────────────
  const boardRef = useRef<HTMLDivElement>(null);

  // Ghost piece rendered at cursor
  const [drag, setDrag] = useState<{
    sq: number;
    x: number;
    y: number;
    color: string;
    kind: string;
  } | null>(null);
  // Stable ref so event handlers always see current drag without stale closure
  const dragRef = useRef<typeof drag>(null);
  const setDragSync = (d: typeof drag) => {
    dragRef.current = d;
    setDrag(d);
  };

  // Hover square during drag
  const [hoverSq, setHoverSq] = useState<number | null>(null);

  // Pointer-start tracking for drag threshold
  const pointerStart = useRef<{ x: number; y: number; sq: number } | null>(null);
  const DRAG_THRESHOLD = 6;

  // ── Special move flash ──────────────────────────────────────────────────────
  const [flashSquares, setFlashSquares] = useState<number[]>([]);
  useEffect(() => {
    if (!lastMove) return undefined;
    if (lastMove.is_castling) {
      const rookTo = lastMove.to === 6 ? 5 : lastMove.to === 2 ? 3 : lastMove.to === 62 ? 61 : 59;
      setFlashSquares([lastMove.to, rookTo]);
      const t = setTimeout(() => setFlashSquares([]), 500);
      return () => clearTimeout(t);
    }
    if (lastMove.is_en_passant) {
      setFlashSquares([lastMove.to]);
      const t = setTimeout(() => setFlashSquares([]), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [lastMove]);

  // ── Board layout helpers ────────────────────────────────────────────────────
  const ranks = flipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = flipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const fileLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const rankLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const topPlayer: PieceColor = flipped ? 'white' : 'black';
  const bottomPlayer: PieceColor = flipped ? 'black' : 'white';

  // Convert pointer position → board square
  const posToSquare = useCallback(
    (clientX: number, clientY: number): number | null => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) return null;
      const fc = Math.floor(relX / SQUARE_SIZE);
      const rc = Math.floor(relY / SQUARE_SIZE);
      const f = flipped ? 7 - fc : fc;
      const r = flipped ? rc : 7 - rc;
      if (f < 0 || f > 7 || r < 0 || r > 7) return null;
      return r * 8 + f;
    },
    [flipped]
  );

  // ── Board-level pointer handlers (capture on board, threshold for drag) ─────
  const boardRef2 = boardRef; // alias for clarity

  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!gameStarted || board.status !== 'playing') return;
      const sq = posToSquare(e.clientX, e.clientY);
      if (sq === null) return;
      pointerStart.current = { x: e.clientX, y: e.clientY, sq };
      boardRef2.current?.setPointerCapture(e.pointerId);
    },
    [gameStarted, board.status, posToSquare, boardRef2]
  );

  const handleBoardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = pointerStart.current;
      if (!start) return;
      const dx = e.clientX - start.x,
        dy = e.clientY - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!dragRef.current && dist > DRAG_THRESHOLD) {
        // Crossed threshold — start a real drag
        const piece = board.pieces.find((p) => p.square === start.sq);
        if (piece && piece.color === board.turn) {
          selectSquare(start.sq);
          setDragSync({
            sq: start.sq,
            x: e.clientX,
            y: e.clientY,
            color: piece.color,
            kind: piece.kind,
          });
        } else {
          pointerStart.current = null; // can't drag opponent/empty square
        }
        return;
      }

      if (dragRef.current) {
        setDragSync({ ...dragRef.current, x: e.clientX, y: e.clientY });
        setHoverSq(posToSquare(e.clientX, e.clientY));
      }
    },
    [board, selectSquare, posToSquare, DRAG_THRESHOLD]
  );

  const handleBoardPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      const d = dragRef.current;

      if (d) {
        // Drag release — attempt the move
        const targetSq = posToSquare(e.clientX, e.clientY);
        setDragSync(null);
        setHoverSq(null);
        if (targetSq !== null && targetSq !== d.sq && validMoves.includes(targetSq)) {
          selectSquare(targetSq);
          setMoveCount((c) => c + 1);
        }
      } else if (start && gameStarted) {
        // Pure click (no drag threshold crossed)
        const sq = posToSquare(e.clientX, e.clientY);
        if (sq !== null && sq === start.sq) {
          selectSquare(sq);
          // selectSquare handles both selection and move completion internally
        }
      }
    },
    [posToSquare, validMoves, selectSquare, gameStarted]
  );

  // Track move count via lastMove changes (cleanest approach)
  const prevLastMoveRef = useRef<LastMoveInfo | null>(null);
  useEffect(() => {
    if (lastMove && lastMove !== prevLastMoveRef.current) {
      prevLastMoveRef.current = lastMove;
      setMoveCount((c) => c + 1);
    }
  }, [lastMove]);

  function handleNewGame() {
    resetGame();
    resetTimers();
    setMoveCount(0);
    setGameStarted(true);
    setDragSync(null);
    setHoverSq(null);
    setFlashSquares([]);
    pointerStart.current = null;
    prevLastMoveRef.current = null;
  }

  const isOver = board.status !== 'playing';
  const gameOverMsg =
    board.status === 'checkmate'
      ? `${board.winner === 'white' ? 'White' : 'Black'} wins by checkmate!`
      : board.status === 'stalemate'
        ? 'Stalemate — draw!'
        : board.status === 'draw'
          ? 'Draw by 50-move rule!'
          : '';

  // Square background colour
  const SQ_LIGHT = '#f0d9b5',
    SQ_DARK = '#b58863';
  const SQ_SEL_L = '#f6f669',
    SQ_SEL_D = '#baca2b';
  const SQ_LAST_L = '#cdd26a',
    SQ_LAST_D = '#aaa23a';
  const SQ_HOVER_L = '#e8f570',
    SQ_HOVER_D = '#b0c030';

  const isLight = (r: number, f: number) => (r + f) % 2 === 0;

  const sqBg = (sq: number, r: number, f: number): string => {
    const light = isLight(r, f);
    if (selectedSquare === sq) return light ? SQ_SEL_L : SQ_SEL_D;
    if (lastMove && (lastMove.from === sq || lastMove.to === sq))
      return light ? SQ_LAST_L : SQ_LAST_D;
    if (hoverSq === sq && drag) return light ? SQ_HOVER_L : SQ_HOVER_D;
    return light ? SQ_LIGHT : SQ_DARK;
  };

  const pieceIds = getPieceIds();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-chess-hero">
      {/* Header */}
      <div className="mb-5 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-1 text-amber-shadow">Chess</h1>
        <p className="text-xs tracking-widest uppercase text-muted-d">
          Two-player · Full rules engine
        </p>
      </div>

      {/* Status banner */}
      <div className="mb-4 h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isOver && gameStarted ? (
            <motion.div
              key="over"
              initial={{ opacity: 0, y: -8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="px-8 py-2 rounded-full text-sm font-bold shadow-2xl btn-amber"
            >
              🏆 {gameOverMsg}
            </motion.div>
          ) : board.in_check && gameStarted ? (
            <motion.div
              key="check"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="px-8 py-2 rounded-full text-sm font-bold check-alert"
            >
              ⚠ {board.turn === 'white' ? 'White' : 'Black'} is in Check!
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex gap-5 items-start flex-wrap justify-center">
        {/* Left sidebar */}
        <div className="flex flex-col gap-3 w-[164px]">
          <PlayerPanel
            color={topPlayer}
            time={formatTime(times[topPlayer])}
            isActive={activeColor === topPlayer}
            inCheck={board.in_check && board.turn === topPlayer}
          />
          <div className="rounded-xl p-3 bg-panel">
            <p className="text-xs uppercase tracking-wider mb-1.5 text-muted-d">Captured</p>
            <CapturedDisplay
              board={board}
              capturedColor={topPlayer === 'white' ? 'black' : 'white'}
            />
          </div>
          <div className="rounded-xl p-3 bg-panel">
            <p className="text-xs uppercase tracking-wider mb-0.5 text-muted-d">
              Move {Math.ceil(moveCount / 2)}
            </p>
            <p className="text-sm font-medium text-[#8b949e]">
              {gameStarted
                ? isOver
                  ? 'Game over'
                  : `${board.turn === 'white' ? 'White' : 'Black'} to move`
                : 'Not started'}
            </p>
          </div>
        </div>

        {/* Board */}
        <div>
          <div className="flex">
            {/* Rank numbers */}
            <div className="flex flex-col justify-around pr-1.5">
              {ranks.map((r) => (
                <div
                  key={r}
                  className="flex items-center justify-center text-xs font-medium w-4 h-16"
                >
                  {rankLabels[r]}
                </div>
              ))}
            </div>

            {/* Board grid */}
            <LayoutGroup>
              <div
                ref={boardRef}
                className="rounded-lg overflow-hidden relative board-frame"
                onPointerDown={handleBoardPointerDown}
                onPointerMove={handleBoardPointerMove}
                onPointerUp={handleBoardPointerUp}
                onPointerCancel={() => {
                  setDragSync(null);
                  setHoverSq(null);
                  pointerStart.current = null;
                }}
              >
                {ranks.map((r) => (
                  <div key={r} className="flex">
                    {files.map((f) => {
                      const sq = r * 8 + f;
                      const piece = board.pieces.find((p) => p.square === sq);
                      // const light = isLight(r, f); // unused
                      const bg = sqBg(sq, r, f);
                      const isValidTarget = validMoves.includes(sq);
                      const isCapture = isValidTarget && !!piece && drag?.sq !== sq;
                      const isDragSource = drag?.sq === sq;
                      const isFlash = flashSquares.includes(sq);

                      return (
                        <div
                          key={sq}
                          className="relative flex items-center justify-center cursor-pointer"
                          style={{ width: SQUARE_SIZE, height: SQUARE_SIZE, backgroundColor: bg }}
                        >
                          {/* Castling / en-passant flash overlay */}
                          <AnimatePresence>
                            {isFlash && (
                              <motion.div
                                className="absolute inset-0 pointer-events-none z-30 flash-overlay"
                                initial={{ opacity: 0.7 }}
                                animate={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                              />
                            )}
                          </AnimatePresence>

                          {/* Valid move dot */}
                          {isValidTarget && !isCapture && !isDragSource && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute w-[22px] h-[22px] rounded-full pointer-events-none z-10 dot-bg"
                            />
                          )}

                          {/* Capture ring */}
                          {isCapture && !isDragSource && (
                            <div className="absolute inset-0 pointer-events-none z-10 capture-ring" />
                          )}

                          {/* King in check red overlay */}
                          {piece?.kind === 'king' &&
                            piece.color === board.turn &&
                            board.in_check && (
                              <motion.div
                                className="absolute inset-0 pointer-events-none z-5 king-check"
                                animate={{ opacity: [0.5, 0.2, 0.5] }}
                                transition={{ repeat: Infinity, duration: 1.2 }}
                              />
                            )}

                          {/* The piece itself — hidden when being dragged */}
                          {piece && (
                            <div
                              className={`z-20 pointer-events-none transition-opacity ${isDragSource ? 'opacity-20' : 'opacity-100'}`}
                            >
                              <motion.div
                                layoutId={pieceIds.get(sq)}
                                transition={{ type: 'spring', stiffness: 500, damping: 42 }}
                              >
                                <ChessPiece
                                  color={piece.color}
                                  kind={piece.kind}
                                  size={SQUARE_SIZE - 6}
                                />
                              </motion.div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </LayoutGroup>
          </div>

          {/* File letters */}
          <div className="flex ml-[22px] mt-1">
            {files.map((f) => (
              <div key={f} className="text-center text-xs font-medium w-16">
                {fileLabels[f]}
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-3 w-[164px]">
          <PlayerPanel
            color={bottomPlayer}
            time={formatTime(times[bottomPlayer])}
            isActive={activeColor === bottomPlayer}
            inCheck={board.in_check && board.turn === bottomPlayer}
          />
          <div className="rounded-xl p-3 bg-panel">
            <p className="text-xs uppercase tracking-wider mb-1.5 text-muted-d">Captured</p>
            <CapturedDisplay
              board={board}
              capturedColor={bottomPlayer === 'white' ? 'black' : 'white'}
            />
          </div>

          {/* Controls */}
          <div className="rounded-xl p-4 flex flex-col gap-3 bg-panel">
            <div>
              <p className="text-xs uppercase tracking-wider mb-2 text-muted-d">Time control</p>
              <div className="grid grid-cols-3 gap-1">
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.seconds}
                    onClick={() => setSelectedTime(opt.seconds)}
                    className={`text-xs py-1.5 rounded-md font-semibold transition-all duration-100 ${selectedTime === opt.seconds ? 'bg-[#f0c060] text-[#0d1117]' : 'bg-[#21262d] text-[#8b949e]'} border-none cursor-pointer`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleNewGame}
              className="w-full py-2.5 rounded-lg font-bold text-sm transition-all duration-100 hover:brightness-110 active:scale-95 btn-amber"
            >
              {gameStarted ? 'New Game' : 'Start Game'}
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setFlipped((x) => !x)}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:brightness-110 active:scale-95 bg-[#21262d] text-[#8b949e] border-none cursor-pointer"
              >
                ⇅ Flip
              </button>
              <button
                onClick={() => {
                  undoMove();
                  setMoveCount((c) => Math.max(0, c - 1));
                }}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:brightness-110 active:scale-95 bg-[#21262d] text-[#8b949e] border-none cursor-pointer"
              >
                ↩ Undo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Move history */}
      <div style={{ width: 8 * SQUARE_SIZE + 22 }} className="mt-3">
        <MoveHistoryPanel moves={moveHistory} lastMoveIdx={moveHistory.length - 1} />
      </div>

      {/* Floating ghost piece during drag */}
      {drag && (
        <div
          className="ghost-piece"
          style={{
            left: drag.x - SQUARE_SIZE / 2,
            top: drag.y - SQUARE_SIZE / 2,
            width: SQUARE_SIZE,
            height: SQUARE_SIZE,
          }}
        >
          <ChessPiece color={drag.color} kind={drag.kind} size={SQUARE_SIZE} lifted />
        </div>
      )}

      {/* Promotion dialog */}
      <AnimatePresence>
        {promotionPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 overlay-dark"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="rounded-2xl p-6 shadow-2xl panel-amber"
            >
              <h3 className="text-sm font-bold text-center mb-5 text-amber">Promote your pawn</h3>
              <div className="flex gap-3">
                {PROMO_PIECES.map((p, i) => (
                  <motion.button
                    key={p.kind}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      confirmPromotion(p.index);
                      setMoveCount((c) => c + 1);
                    }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl promo-btn"
                  >
                    <ChessPiece color={board.turn} kind={p.kind} size={54} />
                    <span className="text-xs font-medium text-[#8b949e]">{p.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!gameStarted && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-sm text-center text-muted-d"
        >
          Choose a time control and click <span className="text-amber">Start Game</span> to play
        </motion.p>
      )}
    </div>
  );
}
