// MasonryGrid component using CSS Grid and ResizeObserver for dynamic row spans
import React, { useEffect, useRef, useState } from 'react';

interface MasonryGridProps {
  children: React.ReactNode;
  breakpointCols: { [key: number]: number };
  className?: string;
}

export function MasonryGrid({ children, breakpointCols, className }: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [spans, setSpans] = useState<Record<string, number>>({});
  const rowHeight = 10; // tiny row height for span calculation

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = Array.from(container.children) as HTMLElement[];
    const ro = new ResizeObserver(() => {
      const newSpans: Record<string, number> = {};
      items.forEach((item) => {
        const key = item.getAttribute('data-masonry-key');
        if (!key) return;
        const height = item.getBoundingClientRect().height;
        const span = Math.ceil(height / rowHeight);
        newSpans[key] = span;
      });
      setSpans(newSpans);
    });
    items.forEach((item) => ro.observe(item));
    return () => ro.disconnect();
  }, [children]);

  // Build responsive grid-template-columns via Tailwind classes passed in className
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '1rem',
    gridAutoRows: `${rowHeight}px`,
  };

  const cloned = React.Children.map(children, (child: any) => {
    if (!React.isValidElement(child)) return child;
    const key = child.key?.toString() ?? Math.random().toString();
    const span = spans[key] ?? 1;
    return React.cloneElement(child, {
      'data-masonry-key': key,
      style: { ...child.props.style, gridRowEnd: `span ${span}` },
    });
  });

  return (
    <div ref={containerRef} className={className} style={gridStyle}>
      {cloned}
    </div>
  );
}
