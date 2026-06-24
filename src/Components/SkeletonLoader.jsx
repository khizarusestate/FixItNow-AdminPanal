export default function SkeletonLoader({ className = '', count = 1 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className={`animate-pulse bg-slate-200 rounded ${className}`}
        />
      ))}
    </>
  );
}
