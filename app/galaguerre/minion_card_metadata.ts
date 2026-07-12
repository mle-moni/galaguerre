import type { MinionPowerSnapshot } from "#api_types/game.types";
import { getMinionPowerEffects } from "#api_types/get_minion_power_effects";

export {
    getBattlecryDescription,
    getDeathrattleDescription,
    getMinionCardDescription,
    getPassiveDescription,
    getSpellCardDescription,
    getSpellEffectDescription,
    getWeaponCardDescription,
} from "#api_types/minion_card_description";

export { getMinionPowerEffects };

export const normalizeMinionPowers = (
    power: MinionPowerSnapshot | null | undefined,
): MinionPowerSnapshot => ({
    hasTaunt: power?.hasTaunt ?? false,
    hasCharge: power?.hasCharge ?? false,
    hasRush: power?.hasRush ?? false,
    hasWindfury: power?.hasWindfury ?? false,
    isPoisonous: power?.isPoisonous ?? false,
    hasStealth: power?.hasStealth ?? false,
    hasDivineShield: power?.hasDivineShield ?? false,
});
