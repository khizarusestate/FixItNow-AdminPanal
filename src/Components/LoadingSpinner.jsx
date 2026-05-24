import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 24, className = '' }) {
  return (
    <Loader2 
      size={size} 
      className={`animate-spin text-blue-600 ${className}`} 
    />
  );
}
