import { test } from "@japa/runner";
import {
    getActiveMinionEffectNames,
    isMinionDescriptionLineDisabled,
} from "../../api_types/get_minion_description_line_state.js";
import type { MinionCard } from "../../api_types/game.types.js";

const createMinionCard = (overrides: Partial<MinionCard> = {}): MinionCard => ({
    uuid: "minion-1",
    cardId: 1,
    label: "Test",
    baseCost: 1,
    cost: 1,
    dynamicCost: null,
    imageUrl: "",
    tags: [],
    type: "MINION",
    attack: 2,
    health: 2,
    minionPowers: {
        hasTaunt: false,
        hasCharge: false,
        hasWindfury: false,
        isPoisonous: false,
        hasStealth: false,
        hasDivineShield: false,
    },
    effects: [],
    description:
        "Monstre 2/2. Immunité : Bloque la première source de dégâts reçue. Discrétion : Ne peut être ciblé par les attaques ou sorts adverses tant qu'il n'a pas attaqué. Reste vulnérable aux effets de zone.",
    battlecryActions: [],
    deathrattleActions: [],
    passives: [],
    ...overrides,
});

test.group("get_minion_description_line_state", () => {
    test("marks consumed keyword lines as disabled", ({ assert }) => {
        const card = createMinionCard({
            minionPowers: {
                hasTaunt: false,
                hasCharge: false,
                hasWindfury: false,
                isPoisonous: false,
                hasStealth: false,
                hasDivineShield: false,
            },
            effects: [],
        });

        const activeEffects = getActiveMinionEffectNames(card);

        assert.isFalse(isMinionDescriptionLineDisabled("Monstre 2/2.", 0, activeEffects));
        assert.isTrue(
            isMinionDescriptionLineDisabled(
                "Immunité : Bloque la première source de dégâts reçue.",
                1,
                activeEffects,
            ),
        );
        assert.isTrue(
            isMinionDescriptionLineDisabled(
                "Discrétion : Ne peut être ciblé par les attaques ou sorts adverses tant qu'il n'a pas attaqué. Reste vulnérable aux effets de zone.",
                2,
                activeEffects,
            ),
        );
    });

    test("keeps active keyword lines enabled", ({ assert }) => {
        const card = createMinionCard({
            minionPowers: {
                hasTaunt: false,
                hasCharge: false,
                hasWindfury: false,
                isPoisonous: false,
                hasStealth: true,
                hasDivineShield: true,
            },
            effects: ["Discrétion", "Immunité"],
        });

        const activeEffects = getActiveMinionEffectNames(card);

        assert.isFalse(
            isMinionDescriptionLineDisabled(
                "Immunité : Bloque la première source de dégâts reçue.",
                1,
                activeEffects,
            ),
        );
        assert.isFalse(
            isMinionDescriptionLineDisabled(
                "Discrétion : Ne peut être ciblé par les attaques ou sorts adverses tant qu'il n'a pas attaqué. Reste vulnérable aux effets de zone.",
                2,
                activeEffects,
            ),
        );
    });

    test("silence disables all non-base lines", ({ assert }) => {
        const card = createMinionCard({
            effects: ["Immunité"],
            minionPowers: {
                hasTaunt: false,
                hasCharge: false,
                hasWindfury: false,
                isPoisonous: false,
                hasStealth: false,
                hasDivineShield: true,
            },
        });

        const activeEffects = getActiveMinionEffectNames(card);

        assert.isTrue(
            isMinionDescriptionLineDisabled("Passif : pioche 1 carte.", 1, activeEffects, true),
        );
        assert.isTrue(
            isMinionDescriptionLineDisabled(
                "Immunité : Bloque la première source de dégâts reçue.",
                1,
                [],
                true,
            ),
        );
    });
});
