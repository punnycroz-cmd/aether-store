// MasonryGrid – CSS multi-column masonry layout
// Uses CSS column-count for a simple, gap-free Pinterest-style layout.
import React from 'react';

interface MasonryGridProps {
  children: React.ReactNode;
  /** Number of columns at each breakpoint (defaults provided) */
  columns?: { sm?: number; md?: number; lg?: number; xl?: number };
  /** Gap between items in px */
  gap?: number;
  className?: string;
}

export function MasonryGrid({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 20,
  className = '',
}: MasonryGridProps) {
  const { sm = 1, md = 2, lg = 3, xl = 4 } = columns;

  return (
    <>
      <style>{`
        .masonry-grid {
          column-count: ${sm};
          column-gap: ${gap}px;
        }
        @media (min-width: 640px) {
          .masonry-grid { column-count: ${md}; }
        }
        @media (min-width: 1024px) {
          .masonry-grid { column-count: ${lg}; }
        }
        @media (min-width: 1280px) {
          .masonry-grid { column-count: ${xl}; }
        }
        .masonry-grid > * {
          break-inside: avoid;
          margin-bottom: ${gap}px;
        }
      `}</style>
      <div className={`masonry-grid ${className}`}>
        {children}
      </div>
    </>
  );
}
