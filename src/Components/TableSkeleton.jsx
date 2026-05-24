export default function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex}
              className="animate-pulse bg-slate-200 rounded h-10 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
