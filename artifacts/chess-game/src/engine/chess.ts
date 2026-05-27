// Full chess engine implemented in TypeScript
// Mirrors the Rust engine in rust/chess-engine/src/lib.rs

export type Color = 'white' | 'black';
export type PieceKind = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type GameStatus = 'playing' | 'checkmate' | 'stalemate' | 'draw';

export interface Piece {
  color: Color;
  kind: PieceKind;
}

export interface ChessMove {
  from: number;
  to: number;
  promotion?: PieceKind;
  isCastling: boolean;
  isEnPassant: boolean;
  capturedPiece?: Piece;
}

export interface BoardInfo {
  pieces: Array<{ square: number; color: Color; kind: PieceKind }>;
  turn: Color;
  in_check: boolean;
  status: GameStatus;
  winner: Color | null;
  en_passant_square: number | null;
}

export interface LastMoveInfo {
  from: number;
  to: number;
  is_castling: boolean;
  is_en_passant: boolean;
}

function rank(sq: number) {
  return Math.floor(sq / 8);
}
function file(sq: number) {
  return sq % 8;
}
function sqOf(r: number, f: number) {
  return r * 8 + f;
}
function opp(c: Color): Color {
  return c === 'white' ? 'black' : 'white';
}

const BACK_RANK: PieceKind[] = [
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
  'bishop',
  'knight',
  'rook',
];

export interface MoveHistoryEntry {
  san: string;
  from: number;
  to: number;
  color: Color;
  moveNumber: number;
}

interface HistoryEntry {
  board: (Piece | null)[];
  castling: { wk: boolean; wq: boolean; bk: boolean; bq: boolean };
  epSquare: number | null;
  halfmove: number;
  move: ChessMove;
  san: string;
  color: Color;
  moveNumber: number;
}

export class ChessEngine {
  private board: (Piece | null)[];
  private turn: Color;
  private castling: { wk: boolean; wq: boolean; bk: boolean; bq: boolean };
  private epSquare: number | null;
  private halfmove: number;
  private fullmove: number;
  private status: GameStatus;
  private winner: Color | null;
  private history: HistoryEntry[];

  constructor() {
    this.board = new Array(64).fill(null);
    this.turn = 'white';
    this.castling = { wk: true, wq: true, bk: true, bq: true };
    this.epSquare = null;
    this.halfmove = 0;
    this.fullmove = 1;
    this.status = 'playing';
    this.winner = null;
    this.history = [];
    this.initBoard();
  }

  private initBoard() {
    for (let f = 0; f < 8; f++) {
      this.board[sqOf(0, f)] = { color: 'white', kind: BACK_RANK[f] };
      this.board[sqOf(1, f)] = { color: 'white', kind: 'pawn' };
      this.board[sqOf(6, f)] = { color: 'black', kind: 'pawn' };
      this.board[sqOf(7, f)] = { color: 'black', kind: BACK_RANK[f] };
    }
  }

  private pieceAt(sq: number): Piece | null {
    return this.board[sq] ?? null;
  }

  private isAttackedBy(sq: number, by: Color): boolean {
    const r = rank(sq),
      f = file(sq);

    // Knight attacks
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ] as [number, number][]) {
      const nr = r + dr,
        nf = f + dc;
      if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
      const p = this.pieceAt(sqOf(nr, nf));
      if (p && p.color === by && p.kind === 'knight') return true;
    }

    // Rook/Queen (straight)
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as [number, number][]) {
      let nr = r + dr,
        nf = f + dc;
      while (nr >= 0 && nr <= 7 && nf >= 0 && nf <= 7) {
        const p = this.pieceAt(sqOf(nr, nf));
        if (p) {
          if (p.color === by && (p.kind === 'rook' || p.kind === 'queen')) return true;
          break;
        }
        nr += dr;
        nf += dc;
      }
    }

    // Bishop/Queen (diagonal)
    for (const [dr, dc] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as [number, number][]) {
      let nr = r + dr,
        nf = f + dc;
      while (nr >= 0 && nr <= 7 && nf >= 0 && nf <= 7) {
        const p = this.pieceAt(sqOf(nr, nf));
        if (p) {
          if (p.color === by && (p.kind === 'bishop' || p.kind === 'queen')) return true;
          break;
        }
        nr += dr;
        nf += dc;
      }
    }

    // Pawn attacks
    const pawnDir = by === 'white' ? 1 : -1;
    for (const dc of [-1, 1]) {
      const pr = r - pawnDir,
        pf = f + dc;
      if (pr >= 0 && pr <= 7 && pf >= 0 && pf <= 7) {
        const p = this.pieceAt(sqOf(pr, pf));
        if (p && p.color === by && p.kind === 'pawn') return true;
      }
    }

    // King attacks
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ] as [number, number][]) {
      const nr = r + dr,
        nf = f + dc;
      if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
      const p = this.pieceAt(sqOf(nr, nf));
      if (p && p.color === by && p.kind === 'king') return true;
    }

    return false;
  }

  private findKing(color: Color): number {
    for (let i = 0; i < 64; i++) {
      const p = this.board[i];
      if (p && p.color === color && p.kind === 'king') return i;
    }
    return -1;
  }

  private inCheck(color: Color): boolean {
    const ks = this.findKing(color);
    if (ks < 0) return false;
    return this.isAttackedBy(ks, opp(color));
  }

  private pseudoMoves(from: number): ChessMove[] {
    const piece = this.pieceAt(from);
    if (!piece || piece.color !== this.turn) return [];

    const r = rank(from),
      f = file(from);
    const moves: ChessMove[] = [];

    const addMove = (
      to: number,
      cap?: Piece | null,
      promo?: PieceKind,
      castling = false,
      ep = false
    ) => {
      moves.push({
        from,
        to,
        promotion: promo,
        isCastling: castling,
        isEnPassant: ep,
        capturedPiece: cap ?? undefined,
      });
    };

    const addSliding = (dirs: [number, number][]) => {
      for (const [dr, dc] of dirs) {
        let nr = r + dr,
          nf = f + dc;
        while (nr >= 0 && nr <= 7 && nf >= 0 && nf <= 7) {
          const tsq = sqOf(nr, nf);
          const cap = this.pieceAt(tsq);
          if (!cap) {
            addMove(tsq);
          } else {
            if (cap.color !== piece.color) addMove(tsq, cap);
            break;
          }
          nr += dr;
          nf += dc;
        }
      }
    };

    switch (piece.kind) {
      case 'pawn': {
        const dir = piece.color === 'white' ? 1 : -1;
        const startRank = piece.color === 'white' ? 1 : 6;
        const promoRank = piece.color === 'white' ? 7 : 0;
        const nr = r + dir;

        if (nr >= 0 && nr <= 7 && !this.pieceAt(sqOf(nr, f))) {
          if (nr === promoRank) {
            for (const k of ['queen', 'rook', 'bishop', 'knight'] as PieceKind[])
              addMove(sqOf(nr, f), null, k);
          } else {
            addMove(sqOf(nr, f));
            if (r === startRank && !this.pieceAt(sqOf(r + 2 * dir, f)))
              addMove(sqOf(r + 2 * dir, f));
          }
        }

        for (const dc of [-1, 1]) {
          const nf2 = f + dc;
          if (nr < 0 || nr > 7 || nf2 < 0 || nf2 > 7) continue;
          const tsq = sqOf(nr, nf2);
          if (tsq === this.epSquare) {
            addMove(tsq, { color: opp(piece.color), kind: 'pawn' }, undefined, false, true);
          } else {
            const cap = this.pieceAt(tsq);
            if (cap && cap.color !== piece.color) {
              if (nr === promoRank) {
                for (const k of ['queen', 'rook', 'bishop', 'knight'] as PieceKind[])
                  addMove(tsq, cap, k);
              } else addMove(tsq, cap);
            }
          }
        }
        break;
      }

      case 'knight':
        for (const [dr, dc] of [
          [-2, -1],
          [-2, 1],
          [-1, -2],
          [-1, 2],
          [1, -2],
          [1, 2],
          [2, -1],
          [2, 1],
        ] as [number, number][]) {
          const nr = r + dr,
            nf = f + dc;
          if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
          const cap = this.pieceAt(sqOf(nr, nf));
          if (!cap || cap.color !== piece.color) addMove(sqOf(nr, nf), cap);
        }
        break;

      case 'king':
        for (const [dr, dc] of [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ] as [number, number][]) {
          const nr = r + dr,
            nf = f + dc;
          if (nr < 0 || nr > 7 || nf < 0 || nf > 7) continue;
          const cap = this.pieceAt(sqOf(nr, nf));
          if (!cap || cap.color !== piece.color) addMove(sqOf(nr, nf), cap);
        }
        // Castling
        if (piece.color === 'white') {
          if (
            this.castling.wk &&
            !this.pieceAt(5) &&
            !this.pieceAt(6) &&
            !this.isAttackedBy(4, 'black') &&
            !this.isAttackedBy(5, 'black') &&
            !this.isAttackedBy(6, 'black')
          )
            addMove(6, null, undefined, true);
          if (
            this.castling.wq &&
            !this.pieceAt(1) &&
            !this.pieceAt(2) &&
            !this.pieceAt(3) &&
            !this.isAttackedBy(4, 'black') &&
            !this.isAttackedBy(3, 'black') &&
            !this.isAttackedBy(2, 'black')
          )
            addMove(2, null, undefined, true);
        } else {
          if (
            this.castling.bk &&
            !this.pieceAt(61) &&
            !this.pieceAt(62) &&
            !this.isAttackedBy(60, 'white') &&
            !this.isAttackedBy(61, 'white') &&
            !this.isAttackedBy(62, 'white')
          )
            addMove(62, null, undefined, true);
          if (
            this.castling.bq &&
            !this.pieceAt(57) &&
            !this.pieceAt(58) &&
            !this.pieceAt(59) &&
            !this.isAttackedBy(60, 'white') &&
            !this.isAttackedBy(59, 'white') &&
            !this.isAttackedBy(58, 'white')
          )
            addMove(58, null, undefined, true);
        }
        break;

      case 'rook':
        addSliding([
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]);
        break;
      case 'bishop':
        addSliding([
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]);
        break;
      case 'queen':
        addSliding([
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ]);
        break;
    }

    return moves;
  }

  private applyMoveToBoard(
    board: (Piece | null)[],
    castling: { wk: boolean; wq: boolean; bk: boolean; bq: boolean },
    epRef: { value: number | null },
    m: ChessMove
  ) {
    const piece = board[m.from]!;

    if (piece.kind === 'king') {
      if (piece.color === 'white') {
        castling.wk = false;
        castling.wq = false;
      } else {
        castling.bk = false;
        castling.bq = false;
      }
    }
    if (piece.kind === 'rook') {
      if (m.from === 0) castling.wq = false;
      if (m.from === 7) castling.wk = false;
      if (m.from === 56) castling.bq = false;
      if (m.from === 63) castling.bk = false;
    }
    if (m.capturedPiece?.kind === 'rook') {
      if (m.to === 0) castling.wq = false;
      if (m.to === 7) castling.wk = false;
      if (m.to === 56) castling.bq = false;
      if (m.to === 63) castling.bk = false;
    }

    if (m.isEnPassant) {
      const capRank = rank(m.to) + (piece.color === 'white' ? -1 : 1);
      board[sqOf(capRank, file(m.to))] = null;
    }

    if (m.isCastling) {
      if (m.to === 6) {
        board[5] = board[7];
        board[7] = null;
      } else if (m.to === 2) {
        board[3] = board[0];
        board[0] = null;
      } else if (m.to === 62) {
        board[61] = board[63];
        board[63] = null;
      } else if (m.to === 58) {
        board[59] = board[56];
        board[56] = null;
      }
    }

    epRef.value =
      piece.kind === 'pawn' && Math.abs(m.to - m.from) === 16
        ? Math.floor((m.from + m.to) / 2)
        : null;

    board[m.to] = m.promotion ? { color: piece.color, kind: m.promotion } : piece;
    board[m.from] = null;
  }

  private isLegal(m: ChessMove): boolean {
    const savedBoard = [...this.board];
    const savedCastling = { ...this.castling };
    const epRef = { value: this.epSquare };
    const color = this.turn;

    this.applyMoveToBoard(this.board, this.castling, epRef, m);

    const ks = this.findKing(color);
    const legal = ks >= 0 && !this.isAttackedBy(ks, opp(color));

    this.board = savedBoard;
    this.castling = savedCastling;
    return legal;
  }

  legalMovesFor(from: number): ChessMove[] {
    return this.pseudoMoves(from).filter((m) => this.isLegal(m));
  }

  allLegalMoves(): ChessMove[] {
    const all: ChessMove[] = [];
    for (let sq = 0; sq < 64; sq++) {
      const p = this.board[sq];
      if (p && p.color === this.turn) all.push(...this.legalMovesFor(sq));
    }
    return all;
  }

  makeMove(from: number, to: number, promotion?: PieceKind): boolean {
    if (this.status !== 'playing') return false;
    const legal = this.legalMovesFor(from);
    const mv = legal.find((m) => m.from === from && m.to === to && m.promotion === promotion);
    if (!mv) return false;

    // Build SAN BEFORE applying (board still in pre-move state)
    let san = this.buildSAN(mv);
    const moveColor = this.turn;
    const moveNumber = this.fullmove;

    const epRef = { value: this.epSquare };
    this.history.push({
      board: [...this.board],
      castling: { ...this.castling },
      epSquare: this.epSquare,
      halfmove: this.halfmove,
      move: mv,
      san: '', // filled in below after status update
      color: moveColor,
      moveNumber,
    });

    this.applyMoveToBoard(this.board, this.castling, epRef, mv);
    this.epSquare = epRef.value;

    const isCapture = !!mv.capturedPiece || mv.isEnPassant;
    const isPawn = this.board[mv.to]?.kind === 'pawn';
    this.halfmove = isCapture || isPawn ? 0 : this.halfmove + 1;

    this.turn = opp(this.turn);
    if (this.turn === 'white') this.fullmove++;

    this.updateStatus();

    // Add check/checkmate suffix now that status is updated
    // `this.status` was previously narrowed to "playing" by the guard at the
    // top of makeMove; cast to string to avoid an unintended-type-comparison
    // TypeScript narrowing that doesn't account for updateStatus() mutating it.
    if ((this.status as string) === 'checkmate') san += '#';
    else if (this.inCheck(this.turn)) san += '+';
    this.history[this.history.length - 1].san = san;

    return true;
  }

  undoMove(): boolean {
    const entry = this.history.pop();
    if (!entry) return false;
    this.board = entry.board;
    this.castling = entry.castling;
    this.epSquare = entry.epSquare;
    this.halfmove = entry.halfmove;
    this.turn = opp(this.turn);
    if (this.turn === 'black' && this.fullmove > 1) this.fullmove--;
    this.status = 'playing';
    this.winner = null;
    return true;
  }

  private updateStatus() {
    if (this.halfmove >= 100) {
      this.status = 'draw';
      return;
    }
    const has = this.allLegalMoves().length > 0;
    if (!has) {
      if (this.inCheck(this.turn)) {
        this.status = 'checkmate';
        this.winner = opp(this.turn);
      } else {
        this.status = 'stalemate';
      }
    } else {
      this.status = 'playing';
      this.winner = null;
    }
  }

  getBoardInfo(): BoardInfo {
    return {
      pieces: this.board.flatMap((p, i) =>
        p ? [{ square: i, color: p.color, kind: p.kind }] : []
      ),
      turn: this.turn,
      in_check: this.inCheck(this.turn),
      status: this.status,
      winner: this.winner,
      en_passant_square: this.epSquare,
    };
  }

  getValidMoves(square: number): number[] {
    return this.legalMovesFor(square).map((m) => m.to);
  }

  getLastMove(): LastMoveInfo | null {
    const last = this.history[this.history.length - 1];
    if (!last) return null;
    return {
      from: last.move.from,
      to: last.move.to,
      is_castling: last.move.isCastling,
      is_en_passant: last.move.isEnPassant,
    };
  }

  getMoveCount(): number {
    return this.history.length;
  }
  isGameOver(): boolean {
    return this.status !== 'playing';
  }

  getMoveHistory(): MoveHistoryEntry[] {
    return this.history.map((e) => ({
      san: e.san,
      from: e.move.from,
      to: e.move.to,
      color: e.color,
      moveNumber: e.moveNumber,
    }));
  }

  private sqAlg(sq: number): string {
    return 'abcdefgh'[file(sq)] + String(rank(sq) + 1);
  }

  private pieceChar(kind: PieceKind): string {
    return (
      { king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '' } as Record<
        PieceKind,
        string
      >
    )[kind];
  }

  private buildSAN(m: ChessMove): string {
    const piece = this.board[m.from]!;
    const isCapture = !!m.capturedPiece || m.isEnPassant;

    if (m.isCastling) {
      return m.to > m.from ? 'O-O' : 'O-O-O';
    }

    if (piece.kind === 'pawn') {
      let san = '';
      if (isCapture) san = 'abcdefgh'[file(m.from)] + 'x';
      san += this.sqAlg(m.to);
      if (m.promotion) san += '=' + this.pieceChar(m.promotion);
      return san;
    }

    const letter = this.pieceChar(piece.kind);

    // Disambiguation: find other pieces of same kind+color that can also reach m.to
    const others: number[] = [];
    for (let sq = 0; sq < 64; sq++) {
      if (sq === m.from) continue;
      const p = this.board[sq];
      if (p && p.color === piece.color && p.kind === piece.kind) {
        if (this.legalMovesFor(sq).some((mv) => mv.to === m.to)) others.push(sq);
      }
    }

    let disambig = '';
    if (others.length > 0) {
      const sameFile = others.filter((sq) => file(sq) === file(m.from));
      const sameRank = others.filter((sq) => rank(sq) === rank(m.from));
      if (sameFile.length === 0) disambig = 'abcdefgh'[file(m.from)];
      else if (sameRank.length === 0) disambig = String(rank(m.from) + 1);
      else disambig = 'abcdefgh'[file(m.from)] + String(rank(m.from) + 1);
    }

    let san = letter + disambig;
    if (isCapture) san += 'x';
    san += this.sqAlg(m.to);
    return san;
  }

  getCapturedPieces(): { white_captured: PieceKind[]; black_captured: PieceKind[] } {
    const counts: Record<PieceKind, number> = {
      queen: 1,
      rook: 2,
      bishop: 2,
      knight: 2,
      pawn: 8,
      king: 0,
    };
    const result = { white_captured: [] as PieceKind[], black_captured: [] as PieceKind[] };
    for (const kind of ['queen', 'rook', 'bishop', 'knight', 'pawn'] as PieceKind[]) {
      const wRemain = this.board.filter((p) => p?.color === 'white' && p.kind === kind).length;
      const bRemain = this.board.filter((p) => p?.color === 'black' && p.kind === kind).length;
      for (let i = wRemain; i < counts[kind]; i++) result.white_captured.push(kind);
      for (let i = bRemain; i < counts[kind]; i++) result.black_captured.push(kind);
    }
    return result;
  }
}
