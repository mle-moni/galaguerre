import type { MinionCard, SpellCard } from "#api_types/game.types";
import { actionRequiresTarget } from "#api_types/target_matching";

export const cardRequiresActionTarget = (card: MinionCard | SpellCard): boolean => {
    return actionRequiresTarget(card);
};
