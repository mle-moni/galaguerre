import { useCallback, useLayoutEffect, useRef, useState } from "react";

const STORAGE_KEY = "galaguerre:action-timeline-position";
const DEFAULT_LEFT = 8;
const DEFAULT_BOTTOM_OFFSET = 200;

export interface TimelinePosition {
    x: number;
    y: number;
}

const readStoredPosition = (): TimelinePosition | null => {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as TimelinePosition;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
            return parsed;
        }
    } catch {
        // ignore invalid session storage data
    }

    return null;
};

const writeStoredPosition = (position: TimelinePosition): void => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(position));
};

export const useActionTimelinePosition = (enabled: boolean) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<TimelinePosition | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{
        pointerX: number;
        pointerY: number;
        x: number;
        y: number;
    } | null>(null);

    const clampPosition = useCallback((x: number, y: number): TimelinePosition => {
        const el = elementRef.current;
        const container = el?.offsetParent as HTMLElement | null;
        if (!el || !container) return { x, y };

        const maxX = Math.max(0, container.clientWidth - el.offsetWidth);
        const maxY = Math.max(0, container.clientHeight - el.offsetHeight);

        return {
            x: Math.min(Math.max(0, x), maxX),
            y: Math.min(Math.max(0, y), maxY),
        };
    }, []);

    useLayoutEffect(() => {
        if (!enabled) return;

        const stored = readStoredPosition();
        if (stored) {
            setPosition(clampPosition(stored.x, stored.y));
            return;
        }

        const el = elementRef.current;
        const container = el?.offsetParent as HTMLElement | null;
        if (!el || !container) return;

        setPosition(
            clampPosition(
                DEFAULT_LEFT,
                container.clientHeight - DEFAULT_BOTTOM_OFFSET - el.offsetHeight,
            ),
        );
    }, [enabled, clampPosition]);

    const endDrag = useCallback(
        (target: EventTarget & Element, pointerId: number, clientX: number, clientY: number) => {
            if (!dragStartRef.current) return;

            const deltaX = clientX - dragStartRef.current.pointerX;
            const deltaY = clientY - dragStartRef.current.pointerY;
            const finalPosition = clampPosition(
                dragStartRef.current.x + deltaX,
                dragStartRef.current.y + deltaY,
            );

            setPosition(finalPosition);
            writeStoredPosition(finalPosition);
            target.releasePointerCapture(pointerId);
            dragStartRef.current = null;
            setIsDragging(false);
        },
        [clampPosition],
    );

    const handleDragHandlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (!position) return;

            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragStartRef.current = {
                pointerX: event.clientX,
                pointerY: event.clientY,
                x: position.x,
                y: position.y,
            };
            setIsDragging(true);
        },
        [position],
    );

    const handleDragHandlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (!dragStartRef.current) return;

            const deltaX = event.clientX - dragStartRef.current.pointerX;
            const deltaY = event.clientY - dragStartRef.current.pointerY;

            setPosition(
                clampPosition(dragStartRef.current.x + deltaX, dragStartRef.current.y + deltaY),
            );
        },
        [clampPosition],
    );

    const handleDragHandlePointerUp = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            endDrag(event.currentTarget, event.pointerId, event.clientX, event.clientY);
        },
        [endDrag],
    );

    const handleDragHandlePointerCancel = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            endDrag(event.currentTarget, event.pointerId, event.clientX, event.clientY);
        },
        [endDrag],
    );

    return {
        elementRef,
        position,
        isDragging,
        handleDragHandlePointerDown,
        handleDragHandlePointerMove,
        handleDragHandlePointerUp,
        handleDragHandlePointerCancel,
    };
};
