import { User } from 'lucide-react';

/**
 * Safe profile picture display with fallback
 */
export function ProfilePictureDisplay({ src, alt = 'Profile', size = 'md', className = '' }) {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size] || 'w-12 h-12';

  if (!src || typeof src !== 'string') {
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center ${className}`}>
        <User size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} className="text-blue-600" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClass} rounded-full object-cover bg-slate-100 ${className}`}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.nextElementSibling?.style.display = 'flex';
      }}
    />
  );
}
