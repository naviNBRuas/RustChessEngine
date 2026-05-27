// Cburnett chess piece set — the exact paths used by Lichess and Wikipedia.
// viewBox: 0 0 45 45. White = light fill + dark stroke. Black = dark fill + light stroke.

const WHITE_FILL = '#f0f0f0';
const WHITE_STROKE = '#202020';
const BLACK_FILL = '#202020';
const BLACK_STROKE = '#b0b0b0';

// Each value is an SVG fragment string; fill/stroke placeholders are F / S / D (detail).
function buildPieces(F: string, S: string, D: string): Record<string, string> {
  return {
    // ── PAWN ──────────────────────────────────────────────────────────────────
    // Round head → tapering neck → flaring chest → wide flat base.
    pawn: `
      <path fill="${F}" stroke="${S}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        d="M22,9
           c-2.21,0 -4,1.79 -4,4  c0,.89 .29,1.71 .78,2.38
           C16.83,16.5 15.5,18.59 15.5,21
           c0,2.03 .94,3.84 2.41,5.03
           C14.91,27.09 11,31.58 11,39.5
           l23,0
           C34,31.58 30.09,27.09 27.09,26.03
           C28.56,24.84 29.5,23.03 29.5,21
           c0,-2.41 -1.33,-4.5 -3.28,-5.62
           C26.71,14.71 27,13.89 27,13
           c0,-2.21 -1.79,-4 -4,-4 -0.17,0 -0.34.01-0.5.01
           C22.34,9.01 22.17,9 22,9 z"/>`,

    // ── ROOK ──────────────────────────────────────────────────────────────────
    // Three battlements at top, solid shaft, wide base.
    rook: `
      <g fill="${F}" stroke="${S}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9,39 L36,39 L36,36 L9,36 L9,39 z"/>
        <path d="M12.5,32 L12.5,36 L32.5,36 L32.5,32 L12.5,32 z"/>
        <path d="M11.5,14 L11.5,9 L15,9 L15,11 L20,11 L20,9 L25,9 L25,11 L30,11 L30,9 L33.5,9 L33.5,14 z"/>
        <path d="M33.5,14 L31,17 L14,17 L11.5,14 z"/>
        <path d="M14,17 L14,29.5 L31,29.5 L31,17 z"/>
        <path d="M31,29.5 L32.5,32 L12.5,32 L14,29.5 z"/>
        <path fill="none" stroke="${D}" stroke-width="1" d="M13,9 L32,9"/>
        <path fill="none" stroke="${D}" stroke-width="1" d="M14,17.5 L31,17.5"/>
      </g>`,

    // ── BISHOP ────────────────────────────────────────────────────────────────
    // Tall mitre body, small ball on top, wide ruffle base.
    bishop: `
      <g fill="none" stroke="${S}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="22.5" cy="8" r="2.5" fill="${F}"/>
        <path fill="${F}" stroke-linecap="butt"
          d="M15,32
             C17.5,34.5 27.5,34.5 30,32
             C30.5,30.5 30,30 30,30
             C30,27.5 27.5,26 27.5,26
             C33,24.5 33.5,14.5 22.5,10.5
             C11.5,14.5 12,24.5 17.5,26
             C17.5,26 15,27.5 15,30
             C15,30 14.5,30.5 15,32 z"/>
        <path fill="${F}" stroke-linecap="butt"
          d="M9,36
             C12.39,35.03 19.11,36.43 22.5,34
             C25.89,36.43 32.61,35.03 36,36
             C36,36 37.65,36.54 39,38
             C38.32,38.97 37.35,38.99 36,38.5
             C32.61,37.53 25.89,38.96 22.5,37.5
             C19.11,38.96 12.39,37.53 9,38.5
             C7.646,38.99 6.677,38.97 6,38
             C7.354,36.06 9,36 9,36 z"/>
        <path fill="none" stroke="${D}" stroke-width="1" stroke-linejoin="miter"
          d="M17.5,26 L27.5,26 M15,30 L30,30 M22.5,15.5 L22.5,20.5 M20,18 L25,18"/>
      </g>`,

    // ── KNIGHT ────────────────────────────────────────────────────────────────
    // Horse head silhouette with nostril and eye details.
    knight: `
      <g fill="none" stroke="${S}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path fill="${F}" stroke-linecap="butt"
          d="M22,10
             C32.5,11 38.5,18 38,39
             L15,39
             C15,30 25,32.5 23,18 z"/>
        <path fill="${F}"
          d="M24,18
             C24.38,20.91 18.45,25.37 16,27
             C13,29 13.18,31.34 11,31
             C9.958,30.06 12.41,27.96 11,28
             C10,28 11.19,29.23 10,30
             C9,30 5.997,31 6,26
             C6,24 12,14 12,14
             C12,14 13.89,12.1 14,10.5
             C13.27,9.506 13.5,8.5 13.5,7.5
             C14.5,6.5 16.5,10 16.5,10
             L18.5,10
             C18.5,10 19.28,8.008 21,7
             C22,7 22,10 22,10 z"/>
        <circle cx="9" cy="25.5" r="0.5" fill="${S}" stroke="none"/>
        <path fill="${S}" stroke="none"
          d="M15,15.5
             a0.5,1.5 30 1,1 -1,0
             a0.5,1.5 30 1,1  1,0"
          transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"/>
      </g>`,

    // ── QUEEN ─────────────────────────────────────────────────────────────────
    // Five orb crown, scalloped collar, wide base.
    queen: `
      <g fill="${F}" stroke="${S}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="6"    cy="12"  r="2.75"/>
        <circle cx="14"   cy="9"   r="2.75"/>
        <circle cx="22.5" cy="8"   r="2.75"/>
        <circle cx="31"   cy="9"   r="2.75"/>
        <circle cx="39"   cy="12"  r="2.75"/>
        <path stroke-linecap="butt"
          d="M9,26
             C17.5,24.5 30,24.5 36,26
             L38.5,13.5
             L31,25
             L30.7,10.9
             L25.5,24.5
             L22.5,10
             L19.5,24.5
             L14.3,10.9
             L14,25
             L6.5,13.5
             L9,26 z"/>
        <path d="M9,26
             C9,28 10.5,28 11.5,30
             C12.5,31.5 12.5,31 12,33.5
             C10.5,34.5 10.5,36 10.5,36
             C9,37.5 11,38.5 11,38.5
             C17.5,39.5 27.5,39.5 34,38.5
             C34,38.5 35.5,37.5 34,36
             C34,36 34.5,34.5 33,33.5
             C32.5,31 32.5,31.5 33.5,30
             C34.5,28 36,28 36,26
             C27.5,24.5 17.5,24.5 9,26 z"/>
        <path fill="none" stroke="${D}" stroke-width="1"
          d="M11.5,30 C15,29 30,29 33.5,30
             M12,33.5 C15,32.5 30,32.5 33,33.5"/>
      </g>`,

    // ── KING ──────────────────────────────────────────────────────────────────
    // Greek-cross finial, shield-shaped upper body, wide caped base.
    king: `
      <g fill="none" stroke="${S}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path stroke-linejoin="miter" d="M22.5,11.63 L22.5,6 M20,8 L25,8"/>
        <path fill="${F}" stroke-linecap="butt" stroke-linejoin="miter"
          d="M22.5,25
             C22.5,25 27,17.5 25.5,14.5
             C25.5,14.5 24.5,12 22.5,12
             C20.5,12 19.5,14.5 19.5,14.5
             C18,17.5 22.5,25 22.5,25 z"/>
        <path fill="${F}"
          d="M11.5,37
             C17,40.5 27,40.5 32.5,37
             L32.5,30
             C32.5,30 41.5,25.5 38.5,19.5
             C34.5,13 25,16.5 22.5,20.5
             C20,16.5 10.5,13 6.5,19.5
             C3.5,25.5 11.5,30 11.5,30
             L11.5,37 z"/>
        <path fill="none" stroke="${D}" stroke-width="1"
          d="M11.5,30 C17,27 27,27 32.5,30
             M11.5,33.5 C17,30.5 27,30.5 32.5,33.5
             M11.5,37 C17,34 27,34 32.5,37"/>
      </g>`,
  };
}

const PIECES: Record<string, Record<string, string>> = {
  white: buildPieces(WHITE_FILL, WHITE_STROKE, '#808080'),
  black: buildPieces(BLACK_FILL, BLACK_STROKE, '#707070'),
};

export function ChessPieceSVG({
  color,
  kind,
  size = 56,
  lifted = false,
}: {
  color: string;
  kind: string;
  size?: number;
  lifted?: boolean;
}) {
  const html = PIECES[color]?.[kind] ?? '';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 45 45"
      width={size}
      height={size}
      className={`select-none pointer-events-none ${lifted ? 'piece-lifted' : 'piece-normal'}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
