import type { MinionCard, SpellCard } from "#api_types/game.types";
import { actionRequiresTarget, type ActionRequiresTargetOptions } from "#api_types/target_matching";

export const cardRequiresActionTarget = (
    card: MinionCard | SpellCard,
    options: ActionRequiresTargetOptions = {},
): boolean => {
    return actionRequiresTarget(card, options);
};
