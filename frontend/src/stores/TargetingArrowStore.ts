import { makeAutoObservable } from "mobx";
import type { GameStore } from "./GameStore.js";

export type Point = { x: number; y: number };

export class TargetingArrowStore {
    public origin: Point | null = null;
    public cursor: Point | null = null;
    public isDragging = false;

    constructor(protected gameStore: GameStore) {
        makeAutoObservable(this);
    }

    get isVisible(): boolean {
        return this.isDragging && this.origin !== null && this.cursor !== null;
    }

    beginDrag(origin: Point, cursor?: Point) {
        this.origin = origin;
        this.cursor = cursor ?? origin;
        this.isDragging = true;
    }

    updateCursor(x: number, y: number) {
        if (!this.isDragging) return;
        this.cursor = { x, y };
    }

    endDrag() {
        this.origin = null;
        this.cursor = null;
        this.isDragging = false;
    }
}
