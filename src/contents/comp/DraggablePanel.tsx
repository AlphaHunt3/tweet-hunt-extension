import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';

interface Position {
    x: number;
    y: number;
}

interface DraggablePanelProps {
    children: React.ReactNode;
    initialPosition?: Position;
    minWidth?: number;
    minHeight?: number;
    className?: string;
    style?: React.CSSProperties;
    onPositionChange?: (position: Position) => void;
    disabled?: boolean;
    boundaryPadding?: number;
    dragHandleClassName?: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export const DraggablePanel = forwardRef<HTMLDivElement, DraggablePanelProps>(({
                                                                                   children,
                                                                                   initialPosition,
                                                                                   minWidth = 0,
                                                                                   minHeight = 0,
                                                                                   className = '',
                                                                                   style = {},
                                                                                   onPositionChange,
                                                                                   disabled = false,
                                                                                   boundaryPadding = 0,
                                                                                   dragHandleClassName,
                                                                                   onMouseEnter,
                                                                                   onMouseLeave,
                                                                               }, ref) => {
    const [position, setPosition] = useState<Position>(initialPosition || { x: -1, y: -1 });
    const [isDragging, setIsDragging] = useState(false);
    const internalRef = useRef<HTMLDivElement>(null);
    const dragStartPosRef = useRef<Position>({ x: 0, y: 0 });
    const positionCheckTimeoutRef = useRef<number>();
    const rafRef = useRef<number>();

    // Combine the forwarded ref with our internal ref
    const panelRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;

    useEffect(() => {
        if (position.x === -1 && position.y === -1 && panelRef.current) {
            const newPosition = initialPosition || {
                x: window.innerWidth - panelRef.current.offsetWidth - boundaryPadding,
                y: boundaryPadding
            };
            setPosition(newPosition);
        }
    }, [position, initialPosition, boundaryPadding]);

    const checkAndAdjustPosition = useCallback(() => {
        if (!panelRef.current) return;

        const panel = panelRef.current;
        const rect = panel.getBoundingClientRect();
        let newX = position.x;
        let newY = position.y;

        const maxX = window.innerWidth - rect.width - boundaryPadding;
        const maxY = window.innerHeight - rect.height - boundaryPadding;
        const minX = boundaryPadding;
        const minY = boundaryPadding;

        if (newX < minX) newX = minX;
        if (newY < minY) newY = minY;
        if (newX > maxX) newX = maxX;
        if (newY > maxY) newY = maxY;

        if (newX !== position.x || newY !== position.y) {
            setPosition({ x: newX, y: newY });
            onPositionChange?.({ x: newX, y: newY });
        }
    }, [position, boundaryPadding, onPositionChange]);

    const updatePosition = useCallback((clientX: number, clientY: number) => {
        if (!panelRef.current || !isDragging) return;

        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }

        rafRef.current = requestAnimationFrame(() => {
            const newX = clientX - dragStartPosRef.current.x;
            const newY = clientY - dragStartPosRef.current.y;

            const maxX = window.innerWidth - panelRef.current!.offsetWidth - boundaryPadding;
            const maxY = window.innerHeight - panelRef.current!.offsetHeight - boundaryPadding;
            const minX = boundaryPadding;
            const minY = boundaryPadding;

            const nextPosition = {
                x: Math.max(minX, Math.min(maxX, newX)),
                y: Math.max(minY, Math.min(maxY, newY))
            };

            setPosition(nextPosition);
            onPositionChange?.(nextPosition);
        });
    }, [isDragging, boundaryPadding, onPositionChange]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            updatePosition(e.clientX, e.clientY);
        };

        const handleMouseUp = () => {
            setIsDragging(false);

            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }

            if (positionCheckTimeoutRef.current) {
                window.clearTimeout(positionCheckTimeoutRef.current);
            }

            positionCheckTimeoutRef.current = window.setTimeout(() => {
                checkAndAdjustPosition();
            }, 150);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isDragging, updatePosition, checkAndAdjustPosition]);

    useEffect(() => {
        const handleResize = () => {
            checkAndAdjustPosition();
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [checkAndAdjustPosition]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (disabled) return;

        // Only allow dragging from the drag handle
        const isDragHandle = (e.target as HTMLElement).closest(`.${dragHandleClassName}`);
        if (!isDragHandle) return;

        if (panelRef.current) {
            const rect = panelRef.current.getBoundingClientRect();
            dragStartPosRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            setIsDragging(true);
            e.preventDefault();
        }
    };

    return (
        <div
            ref={panelRef}
            style={{
                ...style,
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? 'grabbing' : 'auto',
                minWidth,
                minHeight,
            }}
            className={className}
            onMouseDown={disabled ? undefined : handleMouseDown}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </div>
    );
});