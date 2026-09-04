interface Props { rows?: number; cols?: number }

export default function TableSkeleton({ rows = 8, cols = 6 }: Props) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-3 py-3">
              <div
                className="h-3 rounded bg-slate-200 animate-pulse"
                style={{ width: j === 0 ? 72 : j === 1 ? 110 : j === 2 ? 90 : 60 }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
