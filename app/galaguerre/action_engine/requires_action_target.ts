import type { MinionCard } from "#api_types/game.types";
import { actionRequiresTarget } from "#api_types/target_matching";

export const cardRequiresActionTarget = (card: MinionCard): boolean => {
    return actionRequiresTarget(card);
};
