interface Props { count?: number }

export default function KpiSkeleton({ count = 4 }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-card px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-slate-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 rounded bg-slate-200 animate-pulse w-3/4" />
              <div className="h-5 rounded bg-slate-200 animate-pulse w-1/2" />
              <div className="h-2 rounded bg-slate-200 animate-pulse w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
