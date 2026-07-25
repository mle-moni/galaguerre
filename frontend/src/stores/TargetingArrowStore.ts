import { makeAutoObservable } from "mobx";
import type { GameStore } from "./GameStore.js";

export type Point = { x: number; y: number };

type BeginDragOptions = {
    /** Drops from hand can emit a stray pointerup right after beginDrag. */
    ignoreNextPointerUp?: boolean;
};

export class TargetingArrowStore {
    public origin: Point | null = null;
    public cursor: Point | null = null;
    public isDragging = false;
    private ignoreNextPointerUp = false;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get isVisible(): boolean {
        return this.isDragging && this.origin !== null && this.cursor !== null;
    }

    beginDrag(origin: Point, cursor?: Point, options: BeginDragOptions = {}) {
        this.origin = origin;
        this.cursor = cursor ?? origin;
        this.isDragging = true;
        this.ignoreNextPointerUp = options.ignoreNextPointerUp ?? false;
    }

    consumeIgnoredPointerUp(): boolean {
        if (!this.ignoreNextPointerUp) return false;
        this.ignoreNextPointerUp = false;
        return true;
    }

    updateCursor(x: number, y: number) {
        if (!this.isDragging) return;
        this.cursor = { x, y };
    }

    endDrag() {
        this.origin = null;
        this.cursor = null;
        this.isDragging = false;
        this.ignoreNextPointerUp = false;
    }
}
