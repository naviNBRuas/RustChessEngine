use wasm_bindgen::prelude::*;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Color {
    White,
    Black,
}

impl Color {
    fn opposite(self) -> Color {
        match self {
            Color::White => Color::Black,
            Color::Black => Color::White,
        }
    }
    fn as_str(self) -> &'static str {
        match self {
            Color::White => "white",
            Color::Black => "black",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PieceKind {
    King,
    Queen,
    Rook,
    Bishop,
    Knight,
    Pawn,
}

impl PieceKind {
    fn as_str(self) -> &'static str {
        match self {
            PieceKind::King => "king",
            PieceKind::Queen => "queen",
            PieceKind::Rook => "rook",
            PieceKind::Bishop => "bishop",
            PieceKind::Knight => "knight",
            PieceKind::Pawn => "pawn",
        }
    }
    fn from_index(i: u8) -> PieceKind {
        match i {
            0 => PieceKind::Queen,
            1 => PieceKind::Rook,
            2 => PieceKind::Bishop,
            3 => PieceKind::Knight,
            _ => PieceKind::Queen,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Piece {
    pub color: Color,
    pub kind: PieceKind,
}

#[derive(Debug, Clone, Copy)]
pub struct Move {
    pub from: u8,
    pub to: u8,
    pub promotion: Option<PieceKind>,
    pub is_castling: bool,
    pub is_en_passant: bool,
    pub captured_piece: Option<Piece>,
}

#[derive(Debug, Clone)]
pub struct CastlingRights {
    pub wk: bool,
    pub wq: bool,
    pub bk: bool,
    pub bq: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum GameStatus {
    Playing,
    Checkmate(Color),
    Stalemate,
    Draw,
}

#[derive(Debug, Clone)]
struct HistoryEntry {
    mv: Move,
    castling: CastlingRights,
    ep_square: Option<u8>,
    halfmove: u32,
    board: [Option<Piece>; 64],
}

#[derive(Debug, Clone)]
pub struct GameState {
    pub board: [Option<Piece>; 64],
    pub turn: Color,
    pub castling: CastlingRights,
    pub ep_square: Option<u8>,
    pub halfmove_clock: u32,
    pub fullmove: u32,
    pub status: GameStatus,
    history: Vec<HistoryEntry>,
}

fn sq(rank: i32, file: i32) -> u8 {
    (rank * 8 + file) as u8
}
fn rank_of(s: u8) -> i32 { (s / 8) as i32 }
fn file_of(s: u8) -> i32 { (s % 8) as i32 }

impl GameState {
    pub fn new() -> Self {
        let mut board = [None; 64];
        let back_rank = [
            PieceKind::Rook, PieceKind::Knight, PieceKind::Bishop, PieceKind::Queen,
            PieceKind::King, PieceKind::Bishop, PieceKind::Knight, PieceKind::Rook,
        ];
        for f in 0..8usize {
            board[f] = Some(Piece { color: Color::White, kind: back_rank[f] });
            board[8 + f] = Some(Piece { color: Color::White, kind: PieceKind::Pawn });
            board[48 + f] = Some(Piece { color: Color::Black, kind: PieceKind::Pawn });
            board[56 + f] = Some(Piece { color: Color::Black, kind: back_rank[f] });
        }
        GameState {
            board,
            turn: Color::White,
            castling: CastlingRights { wk: true, wq: true, bk: true, bq: true },
            ep_square: None,
            halfmove_clock: 0,
            fullmove: 1,
            status: GameStatus::Playing,
            history: Vec::new(),
        }
    }

    fn piece_at(&self, s: u8) -> Option<Piece> {
        self.board[s as usize]
    }

    fn is_square_attacked(&self, sq_target: u8, by: Color) -> bool {
        let r = rank_of(sq_target);
        let f = file_of(sq_target);

        for (dr, dc) in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)] {
            let nr = r + dr; let nf = f + dc;
            if nr < 0 || nr > 7 || nf < 0 || nf > 7 { continue; }
            if let Some(p) = self.piece_at(sq(nr, nf)) {
                if p.color == by && p.kind == PieceKind::Knight { return true; }
            }
        }

        for (dr, dc) in [(0,1),(0,-1),(1,0),(-1,0)] {
            let (mut nr, mut nf) = (r + dr, f + dc);
            while nr >= 0 && nr <= 7 && nf >= 0 && nf <= 7 {
                if let Some(p) = self.piece_at(sq(nr, nf)) {
                    if p.color == by && matches!(p.kind, PieceKind::Rook | PieceKind::Queen) { return true; }
                    break;
                }
                nr += dr; nf += dc;
            }
        }

        for (dr, dc) in [(1,1),(1,-1),(-1,1),(-1,-1)] {
            let (mut nr, mut nf) = (r + dr, f + dc);
            while nr >= 0 && nr <= 7 && nf >= 0 && nf <= 7 {
                if let Some(p) = self.piece_at(sq(nr, nf)) {
                    if p.color == by && matches!(p.kind, PieceKind::Bishop | PieceKind::Queen) { return true; }
                    break;
                }
                nr += dr; nf += dc;
            }
        }

        let pawn_dir: i32 = if by == Color::White { 1 } else { -1 };
        for dc in [-1i32, 1] {
            let pr = r - pawn_dir; let pf = f + dc;
            if pr >= 0 && pr <= 7 && pf >= 0 && pf <= 7 {
                if let Some(p) = self.piece_at(sq(pr, pf)) {
                    if p.color == by && p.kind == PieceKind::Pawn { return true; }
                }
            }
        }

        for (dr, dc) in [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)] {
            let nr = r + dr; let nf = f + dc;
            if nr < 0 || nr > 7 || nf < 0 || nf > 7 { continue; }
            if let Some(p) = self.piece_at(sq(nr, nf)) {
                if p.color == by && p.kind == PieceKind::King { return true; }
            }
        }

        false
    }

    fn find_king(&self, color: Color) -> u8 {
        for i in 0..64u8 {
            if let Some(p) = self.piece_at(i) {
                if p.color == color && p.kind == PieceKind::King { return i; }
            }
        }
        255
    }

    fn in_check(&self, color: Color) -> bool {
        let ks = self.find_king(color);
        if ks == 255 { return false; }
        self.is_square_attacked(ks, color.opposite())
    }

    fn pseudo_moves_for(&self, from: u8) -> Vec<Move> {
        let piece = match self.piece_at(from) {
            Some(p) if p.color == self.turn => p,
            _ => return vec![],
        };
        let r = rank_of(from);
        let f = file_of(from);
        let mut moves = Vec::new();

        let push_move = |moves: &mut Vec<Move>, to: u8, captured: Option<Piece>, promotion: Option<PieceKind>| {
            moves.push(Move { from, to, promotion, is_castling: false, is_en_passant: false, captured_piece: captured });
        };

        match piece.kind {
            PieceKind::Pawn => {
                let dir: i32 = if piece.color == Color::White { 1 } else { -1 };
                let start_rank: i32 = if piece.color == Color::White { 1 } else { 6 };
                let promo_rank: i32 = if piece.color == Color::White { 7 } else { 0 };

                let nr = r + dir;
                if nr >= 0 && nr <= 7 && self.piece_at(sq(nr, f)).is_none() {
                    if nr == promo_rank {
                        for kind in [PieceKind::Queen, PieceKind::Rook, PieceKind::Bishop, PieceKind::Knight] {
                            push_move(&mut moves, sq(nr, f), None, Some(kind));
                        }
                    } else {
                        push_move(&mut moves, sq(nr, f), None, None);
                        if r == start_rank {
                            let nr2 = r + 2 * dir;
                            if self.piece_at(sq(nr2, f)).is_none() {
                                push_move(&mut moves, sq(nr2, f), None, None);
                            }
                        }
                    }
                }

                for df in [-1i32, 1] {
                    let nf = f + df;
                    if nr < 0 || nr > 7 || nf < 0 || nf > 7 { continue; }
                    let tsq = sq(nr, nf);
                    if Some(tsq) == self.ep_square {
                        moves.push(Move { from, to: tsq, promotion: None, is_castling: false, is_en_passant: true, captured_piece: Some(Piece { color: piece.color.opposite(), kind: PieceKind::Pawn }) });
                    } else if let Some(t) = self.piece_at(tsq) {
                        if t.color != piece.color {
                            if nr == promo_rank {
                                for kind in [PieceKind::Queen, PieceKind::Rook, PieceKind::Bishop, PieceKind::Knight] {
                                    push_move(&mut moves, tsq, Some(t), Some(kind));
                                }
                            } else {
                                push_move(&mut moves, tsq, Some(t), None);
                            }
                        }
                    }
                }
            }
            PieceKind::Knight => {
                for (dr, dc) in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)] {
                    let nr = r + dr; let nf = f + dc;
                    if nr < 0 || nr > 7 || nf < 0 || nf > 7 { continue; }
                    let tsq = sq(nr, nf);
                    let cap = self.piece_at(tsq);
                    if cap.map_or(true, |p| p.color != piece.color) {
                        push_move(&mut moves, tsq, cap, None);
                    }
                }
            }
            PieceKind::King => {
                for (dr, dc) in [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)] {
                    let nr = r + dr; let nf = f + dc;
                    if nr < 0 || nr > 7 || nf < 0 || nf > 7 { continue; }
                    let tsq = sq(nr, nf);
                    let cap = self.piece_at(tsq);
                    if cap.map_or(true, |p| p.color != piece.color) {
                        push_move(&mut moves, tsq, cap, None);
                    }
                }
                if piece.color == Color::White {
                    if self.castling.wk
                        && self.piece_at(5).is_none() && self.piece_at(6).is_none()
                        && !self.is_square_attacked(4, Color::Black)
                        && !self.is_square_attacked(5, Color::Black)
                        && !self.is_square_attacked(6, Color::Black)
                    {
                        moves.push(Move { from: 4, to: 6, promotion: None, is_castling: true, is_en_passant: false, captured_piece: None });
                    }
                    if self.castling.wq
                        && self.piece_at(1).is_none() && self.piece_at(2).is_none() && self.piece_at(3).is_none()
                        && !self.is_square_attacked(4, Color::Black)
                        && !self.is_square_attacked(3, Color::Black)
                        && !self.is_square_attacked(2, Color::Black)
                    {
                        moves.push(Move { from: 4, to: 2, promotion: None, is_castling: true, is_en_passant: false, captured_piece: None });
                    }
                } else {
                    if self.castling.bk
                        && self.piece_at(61).is_none() && self.piece_at(62).is_none()
                        && !self.is_square_attacked(60, Color::White)
                        && !self.is_square_attacked(61, Color::White)
                        && !self.is_square_attacked(62, Color::White)
                    {
                        moves.push(Move { from: 60, to: 62, promotion: None, is_castling: true, is_en_passant: false, captured_piece: None });
                    }
                    if self.castling.bq
                        && self.piece_at(57).is_none() && self.piece_at(58).is_none() && self.piece_at(59).is_none()
                        && !self.is_square_attacked(60, Color::White)
                        && !self.is_square_attacked(59, Color::White)
                        && !self.is_square_attacked(58, Color::White)
                    {
                        moves.push(Move { from: 60, to: 58, promotion: None, is_castling: true, is_en_passant: false, captured_piece: None });
                    }
                }
            }
            PieceKind::Rook => self.add_sliding(&mut moves, from, piece, &[(0,1),(0,-1),(1,0),(-1,0)]),
            PieceKind::Bishop => self.add_sliding(&mut moves, from, piece, &[(1,1),(1,-1),(-1,1),(-1,-1)]),
            PieceKind::Queen => self.add_sliding(&mut moves, from, piece, &[(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]),
        }

        moves
    }

    fn add_sliding(&self, moves: &mut Vec<Move>, from: u8, piece: Piece, dirs: &[(i32, i32)]) {
        let r = rank_of(from); let f = file_of(from);
        for &(dr, dc) in dirs {
            let (mut nr, mut nf) = (r + dr, f + dc);
            while nr >= 0 && nr <= 7 && nf >= 0 && nf <= 7 {
                let tsq = sq(nr, nf);
                match self.piece_at(tsq) {
                    None => moves.push(Move { from, to: tsq, promotion: None, is_castling: false, is_en_passant: false, captured_piece: None }),
                    Some(t) => {
                        if t.color != piece.color {
                            moves.push(Move { from, to: tsq, promotion: None, is_castling: false, is_en_passant: false, captured_piece: Some(t) });
                        }
                        break;
                    }
                }
                nr += dr; nf += dc;
            }
        }
    }

    fn apply_move_to_board(board: &mut [Option<Piece>; 64], castling: &mut CastlingRights, ep_sq: &mut Option<u8>, m: &Move) {
        let piece = board[m.from as usize].unwrap();

        if piece.kind == PieceKind::King {
            match piece.color {
                Color::White => { castling.wk = false; castling.wq = false; }
                Color::Black => { castling.bk = false; castling.bq = false; }
            }
        }
        if piece.kind == PieceKind::Rook {
            match (piece.color, m.from) {
                (Color::White, 0) => castling.wq = false,
                (Color::White, 7) => castling.wk = false,
                (Color::Black, 56) => castling.bq = false,
                (Color::Black, 63) => castling.bk = false,
                _ => {}
            }
        }
        if let Some(cap) = m.captured_piece {
            if cap.kind == PieceKind::Rook {
                match m.to { 0 => castling.wq = false, 7 => castling.wk = false, 56 => castling.bq = false, 63 => castling.bk = false, _ => {} }
            }
        }

        if m.is_en_passant {
            let ep_capture_rank = rank_of(m.to) + if piece.color == Color::White { -1 } else { 1 };
            board[sq(ep_capture_rank, file_of(m.to)) as usize] = None;
        }

        if m.is_castling {
            match m.to {
                6  => { board[5] = board[7]; board[7] = None; }
                2  => { board[3] = board[0]; board[0] = None; }
                62 => { board[61] = board[63]; board[63] = None; }
                58 => { board[59] = board[56]; board[56] = None; }
                _ => {}
            }
        }

        *ep_sq = if piece.kind == PieceKind::Pawn && (m.to as i32 - m.from as i32).abs() == 16 {
            Some(((m.from as i32 + m.to as i32) / 2) as u8)
        } else {
            None
        };

        board[m.to as usize] = Some(if let Some(pk) = m.promotion {
            Piece { color: piece.color, kind: pk }
        } else {
            piece
        });
        board[m.from as usize] = None;
    }

    fn is_legal(&mut self, m: &Move) -> bool {
        let color = self.turn;
        let saved_board = self.board;
        let mut saved_castling = self.castling.clone();
        let mut saved_ep = self.ep_square;

        Self::apply_move_to_board(&mut self.board, &mut saved_castling, &mut saved_ep, m);
        let legal = !self.in_check(color);

        self.board = saved_board;
        legal
    }

    pub fn legal_moves_for(&mut self, from: u8) -> Vec<Move> {
        let pseudo = self.pseudo_moves_for(from);
        pseudo.into_iter().filter(|m| self.is_legal(m)).collect()
    }

    pub fn all_legal_moves(&mut self) -> Vec<Move> {
        let mut all = Vec::new();
        for s in 0..64u8 {
            if let Some(p) = self.piece_at(s) {
                if p.color == self.turn {
                    all.extend(self.legal_moves_for(s));
                }
            }
        }
        all
    }

    pub fn make_move(&mut self, from: u8, to: u8, promotion: Option<PieceKind>) -> bool {
        let legal = self.legal_moves_for(from);
        let mv = legal.iter().copied().find(|m| {
            m.from == from && m.to == to && m.promotion == promotion
        });
        let mv = match mv { Some(m) => m, None => return false };

        self.history.push(HistoryEntry {
            mv,
            castling: self.castling.clone(),
            ep_square: self.ep_square,
            halfmove: self.halfmove_clock,
            board: self.board,
        });

        let mut castling = self.castling.clone();
        let mut ep = self.ep_square;
        Self::apply_move_to_board(&mut self.board, &mut castling, &mut ep, &mv);
        self.castling = castling;
        self.ep_square = ep;

        let is_capture = mv.captured_piece.is_some() || mv.is_en_passant;
        let is_pawn_move = self.board[mv.to as usize].map_or(false, |p| p.kind == PieceKind::Pawn);
        if is_capture || is_pawn_move {
            self.halfmove_clock = 0;
        } else {
            self.halfmove_clock += 1;
        }

        self.turn = self.turn.opposite();
        if self.turn == Color::White { self.fullmove += 1; }

        self.update_status();
        true
    }

    pub fn undo_move(&mut self) -> bool {
        if let Some(entry) = self.history.pop() {
            self.board = entry.board;
            self.castling = entry.castling;
            self.ep_square = entry.ep_square;
            self.halfmove_clock = entry.halfmove;
            self.turn = self.turn.opposite();
            if self.turn == Color::Black && self.fullmove > 1 { self.fullmove -= 1; }
            self.status = GameStatus::Playing;
            true
        } else {
            false
        }
    }

    fn update_status(&mut self) {
        if self.halfmove_clock >= 100 {
            self.status = GameStatus::Draw;
            return;
        }
        let has_legal = !self.all_legal_moves().is_empty();
        if !has_legal {
            if self.in_check(self.turn) {
                self.status = GameStatus::Checkmate(self.turn.opposite());
            } else {
                self.status = GameStatus::Stalemate;
            }
        } else {
            self.status = GameStatus::Playing;
        }
    }

    pub fn get_captured_pieces(&self) -> (Vec<Piece>, Vec<Piece>) {
        let mut white_captured = Vec::new();
        let mut black_captured = Vec::new();
        let initial_counts = [
            (PieceKind::Queen, 1), (PieceKind::Rook, 2), (PieceKind::Bishop, 2),
            (PieceKind::Knight, 2), (PieceKind::Pawn, 8),
        ];
        for (kind, count) in &initial_counts {
            let on_board_white = self.board.iter().flatten().filter(|p| p.color == Color::White && p.kind == *kind).count();
            let on_board_black = self.board.iter().flatten().filter(|p| p.color == Color::Black && p.kind == *kind).count();
            for _ in on_board_white..*count {
                white_captured.push(Piece { color: Color::White, kind: *kind });
            }
            for _ in on_board_black..*count {
                black_captured.push(Piece { color: Color::Black, kind: *kind });
            }
        }
        (white_captured, black_captured)
    }
}

#[derive(Serialize)]
struct PieceInfo { square: u8, color: &'static str, kind: &'static str }

#[derive(Serialize)]
struct BoardInfo {
    pieces: Vec<PieceInfo>,
    turn: &'static str,
    in_check: bool,
    status: &'static str,
    winner: Option<&'static str>,
    en_passant_square: Option<u8>,
}

#[derive(Serialize)]
struct LastMoveInfo { from: u8, to: u8, is_castling: bool, is_en_passant: bool }

#[derive(Serialize)]
struct CapturedInfo { white_captured: Vec<String>, black_captured: Vec<String> }

#[wasm_bindgen]
pub struct ChessEngine {
    state: GameState,
}

#[wasm_bindgen]
impl ChessEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> ChessEngine {
        ChessEngine { state: GameState::new() }
    }

    pub fn get_board_json(&mut self) -> String {
        let pieces: Vec<PieceInfo> = self.state.board.iter().enumerate()
            .filter_map(|(i, p)| p.map(|p| PieceInfo { square: i as u8, color: p.color.as_str(), kind: p.kind.as_str() }))
            .collect();

        let in_check = self.state.in_check(self.state.turn);
        let (status, winner) = match &self.state.status {
            GameStatus::Playing => ("playing", None),
            GameStatus::Checkmate(c) => ("checkmate", Some(c.as_str())),
            GameStatus::Stalemate => ("stalemate", None),
            GameStatus::Draw => ("draw", None),
        };

        serde_json::to_string(&BoardInfo {
            pieces,
            turn: self.state.turn.as_str(),
            in_check,
            status,
            winner,
            en_passant_square: self.state.ep_square,
        }).unwrap()
    }

    pub fn get_valid_moves_json(&mut self, square: u8) -> String {
        let moves = self.state.legal_moves_for(square);
        let targets: Vec<u8> = moves.iter().map(|m| m.to).collect();
        serde_json::to_string(&targets).unwrap()
    }

    pub fn make_move(&mut self, from: u8, to: u8, promotion: Option<u8>) -> bool {
        if self.state.status != GameStatus::Playing { return false; }
        let promo = promotion.map(PieceKind::from_index);
        self.state.make_move(from, to, promo)
    }

    pub fn undo_move(&mut self) -> bool {
        self.state.undo_move()
    }

    pub fn get_last_move_json(&self) -> String {
        match self.state.history.last() {
            Some(e) => serde_json::to_string(&LastMoveInfo {
                from: e.mv.from, to: e.mv.to,
                is_castling: e.mv.is_castling,
                is_en_passant: e.mv.is_en_passant,
            }).unwrap(),
            None => "null".to_string(),
        }
    }

    pub fn get_move_count(&self) -> u32 {
        self.state.history.len() as u32
    }

    pub fn is_game_over(&self) -> bool {
        self.state.status != GameStatus::Playing
    }

    pub fn get_captured_json(&self) -> String {
        let (wc, bc) = self.state.get_captured_pieces();
        serde_json::to_string(&CapturedInfo {
            white_captured: wc.iter().map(|p| p.kind.as_str().to_string()).collect(),
            black_captured: bc.iter().map(|p| p.kind.as_str().to_string()).collect(),
        }).unwrap()
    }
}
