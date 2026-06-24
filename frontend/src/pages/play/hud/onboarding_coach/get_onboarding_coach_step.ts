import { playerHasBoardSpace } from "#api_types/board";
import type { GameStore } from "~/stores/GameStore";
import { canMinionAttack, getMinionHasTaunt } from "~/helpers/minion_combat";

export type OnboardingCoachStepId =
    | "first_turn"
    | "play_card"
    | "attack"
    | "taunt"
    | "pass_turn"
    | "timer";

export interface OnboardingCoachStep {
    id: OnboardingCoachStepId;
    message: string;
}

const hasPlayableCard = (store: GameStore): boolean => {
    if (!store.isMyTurn) return false;

    const { me } = store;
    return me.hand.some((card) => {
        if (card.cost > me.mana) return false;
        if (card.type === "MINION" && !playerHasBoardSpace(me)) return false;
        return true;
    });
};

const hasAttackableMinion = (store: GameStore): boolean => {
    if (!store.isMyTurn) return false;

    const round = store.authoritativeGame.data.currentRound;
    return store.me.board.some((minion) => canMinionAttack(minion, round));
};

const opponentHasTaunt = (store: GameStore): boolean =>
    store.opponent.board.some((minion) => getMinionHasTaunt(minion));

const ONBOARDING_COACH_STEPS: Array<{
    id: OnboardingCoachStepId;
    getMessage: (store: GameStore) => string;
    isActive: (store: GameStore) => boolean;
}> = [
    {
        id: "first_turn",
        getMessage: (store) =>
            `Vous avez ${store.me.mana} mana. Jouez un serviteur à faible coût pour prendre le plateau.`,
        isActive: (store) => {
            const round = store.authoritativeGame.data.currentRound;
            return (
                round === 1 &&
                store.isMyTurn &&
                store.me.board.length === 0 &&
                store.me.hand.length > 0
            );
        },
    },
    {
        id: "play_card",
        getMessage: () => "Cliquez sur une carte lumineuse dans votre main pour la jouer.",
        isActive: (store) =>
            store.isMyTurn && hasPlayableCard(store) && store.me.board.length === 0,
    },
    {
        id: "attack",
        getMessage: () =>
            "Glissez votre serviteur vers l'adversaire (en haut à gauche) pour l'attaquer.",
        isActive: (store) =>
            store.isMyTurn && hasAttackableMinion(store) && !opponentHasTaunt(store),
    },
    {
        id: "taunt",
        getMessage: () => "Provocation : vous devez attaquer ce serviteur avant les autres cibles.",
        isActive: (store) =>
            store.isMyTurn && opponentHasTaunt(store) && hasAttackableMinion(store),
    },
    {
        id: "pass_turn",
        getMessage: () => "Passez votre tour quand vous n'avez plus d'action utile.",
        isActive: (store) => {
            const round = store.authoritativeGame.data.currentRound;
            return (
                round === 1 &&
                store.isMyTurn &&
                !hasPlayableCard(store) &&
                !hasAttackableMinion(store)
            );
        },
    },
    {
        id: "timer",
        getMessage: () =>
            "Vous avez environ 105 secondes par tour. À 0, votre tour se termine automatiquement.",
        isActive: (store) => {
            const round = store.authoritativeGame.data.currentRound;
            return (
                store.isMyTurn &&
                round <= 2 &&
                store.authoritativeGame.data.turnEndsAt !== undefined
            );
        },
    },
];

export const getActiveOnboardingCoachStep = (
    store: GameStore,
    dismissedStepIds: ReadonlySet<OnboardingCoachStepId>,
): OnboardingCoachStep | null => {
    if (store.isMulligan || store.isFinished) return null;

    for (const step of ONBOARDING_COACH_STEPS) {
        if (dismissedStepIds.has(step.id)) continue;
        if (!step.isActive(store)) continue;

        return {
            id: step.id,
            message: step.getMessage(store),
        };
    }

    return null;
};
