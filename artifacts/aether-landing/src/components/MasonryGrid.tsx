// MasonryGrid – Stable flexbox-column masonry layout
// Items are distributed round-robin into explicit column containers.
// When new items are appended, existing items stay in place — no rebalancing.
import React, { useState, useEffect, useCallback } from 'react';

interface MasonryGridProps {
  children: React.ReactNode;
  className?: string;
}

function getColumnCount(): number {
  if (typeof window === 'undefined') return 4;
  const w = window.innerWidth;
  if (w >= 1280) return 4;
  if (w >= 1024) return 3;
  if (w >= 640) return 2;
  return 1;
}

export function MasonryGrid({ children, className = '' }: MasonryGridProps) {
  const [colCount, setColCount] = useState(getColumnCount);

  const handleResize = useCallback(() => {
    setColCount(getColumnCount());
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Flatten children into an array (handles fragments, AnimatePresence wrappers, etc.)
  const items = React.Children.toArray(children).filter(React.isValidElement);

  // Distribute items round-robin into columns (preserves left-to-right reading order)
  const columns: React.ReactElement[][] = Array.from({ length: colCount }, () => []);
  items.forEach((child, i) => {
    columns[i % colCount].push(child as React.ReactElement);
  });

  return (
    <div className={className} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {col}
        </div>
      ))}
    </div>
  );
}
