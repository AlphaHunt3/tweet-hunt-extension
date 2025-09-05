import React from 'react';

interface XLogoProps {
  className?: string;
}

export function XLogo({ className = 'w-4 h-4' }: XLogoProps) {
  return (
    <svg
      className={className}
      viewBox='0 0 24 24'
      aria-hidden='true'
      focusable='false'
      fill='currentColor'
    >
      <path d='M18.244 2H21l-6.652 8.1L22 22h-6.656l-5.24-7.617L4.964 22H2l7.19-8.629L2 2h6.656l4.713 6.861L18.244 2zm-2.34 18h1.807L8.129 4h-1.8l9.576 16z' />
    </svg>
  );
}
