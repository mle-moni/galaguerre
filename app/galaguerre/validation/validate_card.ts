import type Card from "#models/card";
import { validateAction } from "./validate_action.js";
import { validateDeathrattleAction } from "./validate_deathrattle_action.js";
import type { DeckValidationErrorDetail } from "./validate_deck.js";

export const validateCard = (card: Card): DeckValidationErrorDetail[] => {
    const errors: DeckValidationErrorDetail[] = [];

    if (card.type === "WEAPON") {
        if (!card.weapon) {
            errors.push({
                cardId: card.id,
                cardLabel: card.label,
                reason: "weapon not found",
            });
            return errors;
        }

        for (const deathrattleAction of card.weapon.deathrattleActions ?? []) {
            const actionError = validateDeathrattleAction(deathrattleAction.action);
            if (!actionError) continue;

            errors.push({
                cardId: card.id,
                cardLabel: card.label,
                actionId: actionError.actionId,
                actionInternalLabel: actionError.internalLabel,
                reason: actionError.reason,
            });
        }

        return errors;
    }

    if (card.type === "SPELL") {
        if (!card.spell) {
            errors.push({
                cardId: card.id,
                cardLabel: card.label,
                reason: "spell not found",
            });
            return errors;
        }

        const actionError = validateAction(card.spell.action);
        if (actionError) {
            errors.push({
                cardId: card.id,
                cardLabel: card.label,
                actionId: actionError.actionId,
                actionInternalLabel: actionError.internalLabel,
                reason: actionError.reason,
            });
        }

        return errors;
    }

    if (card.type !== "MINION") {
        errors.push({
            cardId: card.id,
            cardLabel: card.label,
            reason: `type ${card.type} not supported`,
        });
        return errors;
    }

    if (!card.minion) {
        errors.push({
            cardId: card.id,
            cardLabel: card.label,
            reason: "minion not found",
        });
        return errors;
    }

    for (const battlecryAction of card.minion.battlecryActions ?? []) {
        const actionError = validateAction(battlecryAction.action);
        if (!actionError) continue;

        errors.push({
            cardId: card.id,
            cardLabel: card.label,
            actionId: actionError.actionId,
            actionInternalLabel: actionError.internalLabel,
            reason: actionError.reason,
        });
    }

    for (const deathrattleAction of card.minion.deathrattleActions ?? []) {
        const actionError = validateDeathrattleAction(deathrattleAction.action);
        if (!actionError) continue;

        errors.push({
            cardId: card.id,
            cardLabel: card.label,
            actionId: actionError.actionId,
            actionInternalLabel: actionError.internalLabel,
            reason: actionError.reason,
        });
    }

    return errors;
};
