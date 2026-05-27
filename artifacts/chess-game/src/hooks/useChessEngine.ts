import { useState, useRef, useCallback } from 'react';
import {
  ChessEngine,
  type BoardInfo,
  type LastMoveInfo,
  type MoveHistoryEntry,
} from '@/engine/chess';

export type { BoardInfo, LastMoveInfo, MoveHistoryEntry };
export type PieceColor = 'white' | 'black';
export type PieceKind = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw';

export interface PromotionPending {
  from: number;
  to: number;
}

export function useChessEngine() {
  const engineRef = useRef<ChessEngine>(new ChessEngine());
  const [board, setBoard] = useState<BoardInfo>(() => engineRef.current.getBoardInfo());
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [lastMove, setLastMove] = useState<LastMoveInfo | null>(null);
  const [promotionPending, setPromotionPending] = useState<PromotionPending | null>(null);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);

  const refreshBoard = useCallback(() => {
    setBoard(engineRef.current.getBoardInfo());
    setLastMove(engineRef.current.getLastMove());
    setMoveHistory(engineRef.current.getMoveHistory());
  }, []);

  const selectSquare = useCallback(
    (square: number) => {
      const b = engineRef.current.getBoardInfo();
      if (b.status !== 'playing') return;

      const piece = b.pieces.find((p) => p.square === square);

      if (selectedSquare === null) {
        if (piece && piece.color === b.turn) {
          setSelectedSquare(square);
          setValidMoves(engineRef.current.getValidMoves(square));
        }
        return;
      }

      if (square === selectedSquare) {
        setSelectedSquare(null);
        setValidMoves([]);
        return;
      }

      if (piece && piece.color === b.turn) {
        setSelectedSquare(square);
        setValidMoves(engineRef.current.getValidMoves(square));
        return;
      }

      const moves = engineRef.current.getValidMoves(selectedSquare);
      if (moves.includes(square)) {
        const movingPiece = b.pieces.find((p) => p.square === selectedSquare);
        const isPawnPromotion =
          movingPiece?.kind === 'pawn' &&
          ((movingPiece.color === 'white' && Math.floor(square / 8) === 7) ||
            (movingPiece.color === 'black' && Math.floor(square / 8) === 0));

        if (isPawnPromotion) {
          setPromotionPending({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setValidMoves([]);
          return;
        }

        engineRef.current.makeMove(selectedSquare, square, undefined);
        refreshBoard();
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    },
    [selectedSquare, refreshBoard]
  );

  const confirmPromotion = useCallback(
    (pieceIndex: number) => {
      if (!promotionPending) return;
      const kinds = ['queen', 'rook', 'bishop', 'knight'] as const;
      engineRef.current.makeMove(
        promotionPending.from,
        promotionPending.to,
        kinds[pieceIndex] ?? 'queen'
      );
      refreshBoard();
      setPromotionPending(null);
    },
    [promotionPending, refreshBoard]
  );

  const resetGame = useCallback(() => {
    engineRef.current = new ChessEngine();
    refreshBoard();
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setPromotionPending(null);
    setMoveHistory([]);
  }, [refreshBoard]);

  const undoMove = useCallback(() => {
    engineRef.current.undoMove();
    refreshBoard();
    setSelectedSquare(null);
    setValidMoves([]);
    setPromotionPending(null);
  }, [refreshBoard]);

  return {
    ready: true,
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
  };
}
