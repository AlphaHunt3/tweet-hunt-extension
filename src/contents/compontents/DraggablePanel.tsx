import React, { forwardRef, useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';

interface DraggablePanelProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  dragHandleClassName?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  width: number;
}

export const DraggablePanel = forwardRef<HTMLDivElement, DraggablePanelProps>(({
  children,
  className = '',
  disabled = false,
  dragHandleClassName,
  onMouseEnter,
  onMouseLeave,
  width,
}, ref) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({
    x: window.innerWidth - width - 16,
    y: 16
  });

  const handleDrag = (_e: any, data: { x: number; y: number }) => {
    const maxX = window.innerWidth - width - 16;
    const minX = 16;
    const maxY = window.innerHeight - 100;
    const minY = 16;

    const boundedX = Math.min(Math.max(data.x, minX), maxX);
    const boundedY = Math.min(Math.max(data.y, minY), maxY);

    setPosition({ x: boundedX, y: boundedY });
  };

  useEffect(() => {
    setPosition(prev => ({
      x: window.innerWidth - width - 16,
      y: prev.y
    }));
  }, [width]);

  useEffect(() => {
    const handleResize = () => {
      const maxX = window.innerWidth - width - 16;
      setPosition(prev => ({
        x: maxX,
        y: prev.y
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, position]);

  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      onDrag={handleDrag}
      handle={`.${dragHandleClassName}`}
      bounds={{
        top: 16,
        left: 16,
        right: window.innerWidth - width - 16,
        bottom: window.innerHeight - 100
      }}
      disabled={disabled}
    >
      <div
        ref={nodeRef}
        className={`${className} fixed`}
        style={{
          visibility: 'visible',
          zIndex: 1000,
          width: `${width}px`
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </div>
    </Draggable>
  );
});

DraggablePanel.displayName = 'DraggablePanel';
