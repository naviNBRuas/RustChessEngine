import { describe, it, expect } from 'vitest';
import { ChessEngine } from './chess';

describe('ChessEngine basic moves', () => {
  it('initial board has 32 pieces', () => {
    const e = new ChessEngine();
    const board = e.getBoardInfo();
    expect(board.pieces.length).toBe(32);
  });

  it('white can move pawn forward', () => {
    const e = new ChessEngine();
    const moves = e.getValidMoves(8); // pawn at a2 -> index 8
    expect(moves).toContain(16);
  });
});
