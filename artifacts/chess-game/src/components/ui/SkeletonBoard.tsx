import React from 'react';

export default function SkeletonBoard({
  size = 8,
  square = 64,
}: {
  size?: number;
  square?: number;
}) {
  const squares = Array.from({ length: size * size }, (_, i) => i);
  return (
    <div
      style={{ width: size * square, height: size * square }}
      className="rounded-xl overflow-hidden"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, ${square}px)` }}>
        {squares.map((s) => (
          <div key={s} className={`animate-pulse ${s % 2 === 0 ? 'skel-light' : 'skel-dark'}`} />
        ))}
      </div>
    </div>
  );
}
