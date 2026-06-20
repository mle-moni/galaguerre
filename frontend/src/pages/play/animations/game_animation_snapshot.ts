import type { SpotOwner } from "#api_types/game.types";
import type { AnimationRect } from "~/stores/AnimationStore";

export interface GameAnimationSnapshot {
    board?: AnimationRect;
    cards: Map<string, AnimationRect>;
    spots: Map<string, AnimationRect>;
    heroes: Map<SpotOwner, AnimationRect>;
    decks: Map<SpotOwner, AnimationRect>;
    hands: Map<SpotOwner, AnimationRect>;
}

export const getBoardKey = (owner: SpotOwner, boardIndex: number) => `${owner}:${boardIndex}`;

const readRect = (element: Element): AnimationRect => {
    const rect = element.getBoundingClientRect();

    return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
    };
};

const readOwner = (element: Element): SpotOwner | null => {
    const owner = element.getAttribute("data-animation-owner");
    if (owner === "PLAYER" || owner === "OPPONENT") return owner;

    return null;
};

export const getRectCenter = (rect: AnimationRect) => ({
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
});

export const getFallbackRect = (rects: (AnimationRect | undefined)[]): AnimationRect => {
    const rect = rects.find(Boolean);
    if (rect) return rect;

    return {
        x: window.innerWidth / 2 - 20,
        y: window.innerHeight / 2 - 20,
        width: 40,
        height: 40,
    };
};

export const readGameAnimationSnapshot = (): GameAnimationSnapshot => {
    const boardElement = document.querySelector("[data-animation-board]");
    const board = boardElement ? readRect(boardElement) : undefined;
    const cards = new Map<string, AnimationRect>();
    const spots = new Map<string, AnimationRect>();
    const heroes = new Map<SpotOwner, AnimationRect>();
    const decks = new Map<SpotOwner, AnimationRect>();
    const hands = new Map<SpotOwner, AnimationRect>();

    for (const element of Array.from(document.querySelectorAll("[data-playing-card-id]"))) {
        const cardId = element.getAttribute("data-playing-card-id");
        if (cardId) cards.set(cardId, readRect(element));
    }

    for (const element of Array.from(
        document.querySelectorAll("[data-target-zone][data-spot-owner]"),
    )) {
        const owner = element.getAttribute("data-spot-owner");
        if (owner !== "PLAYER" && owner !== "OPPONENT") continue;

        const boardIndexAttr = element.getAttribute("data-board-index");
        if (boardIndexAttr === "hero") {
            heroes.set(owner, readRect(element));
            continue;
        }

        if (boardIndexAttr !== null) {
            spots.set(getBoardKey(owner, Number(boardIndexAttr)), readRect(element));
        }
    }

    for (const element of Array.from(document.querySelectorAll("[data-animation-deck]"))) {
        const owner = readOwner(element);
        if (owner) decks.set(owner, readRect(element));
    }

    for (const element of Array.from(document.querySelectorAll("[data-animation-hand]"))) {
        const owner = readOwner(element);
        if (owner) hands.set(owner, readRect(element));
    }

    return { board, cards, spots, heroes, decks, hands };
};
