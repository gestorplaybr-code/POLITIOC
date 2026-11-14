export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5">
      <div className="grid border-b border-white/5 bg-white/[0.02] px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: "1rem" }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="cinema-shimmer h-3 w-2/3 rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid border-b border-white/5 px-4 py-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: "1rem" }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="cinema-shimmer h-4 rounded" style={{ width: `${50 + ((r + c) % 4) * 12}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="cinema-shimmer h-10 w-10 rounded-xl" />
          <div className="cinema-shimmer mt-4 h-3 w-1/3 rounded" />
          <div className="cinema-shimmer mt-2 h-8 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}