import { test } from "@japa/runner";
import { CARD_TAGS, CARD_TAG_LABELS } from "../../app/galaguerre/card_tags.js";
import {
    CARD_FAMILY_GLOSSARY_ENTRIES,
    EFFECT_DESCRIPTIONS,
    EFFECT_SYMBOLS,
    KEYWORD_GLOSSARY_ENTRIES,
} from "../../api_types/card_keyword_glossary.js";
import { getMinionPowerEffects } from "../../api_types/get_minion_power_effects.js";

const MINION_POWER_EFFECTS = getMinionPowerEffects({
    hasTaunt: true,
    hasCharge: true,
    hasRush: true,
    hasWindfury: true,
    isPoisonous: true,
    hasStealth: true,
    hasDivineShield: true,
});

const BOARD_KEYWORD_NAMES = ["Dernier souffle", "Effet déclenché"];

test.group("card_keyword_glossary", () => {
    test("covers every minion power effect with symbol and description", ({ assert }) => {
        for (const effect of MINION_POWER_EFFECTS) {
            assert.isTrue(EFFECT_SYMBOLS[effect]?.length > 0, `missing symbol for ${effect}`);
            assert.isTrue(
                EFFECT_DESCRIPTIONS[effect]?.length > 0,
                `missing description for ${effect}`,
            );
        }
    });

    test("covers board-only keyword icons", ({ assert }) => {
        for (const name of BOARD_KEYWORD_NAMES) {
            const entry = KEYWORD_GLOSSARY_ENTRIES.find((item) => item.name === name);
            assert.isDefined(entry);
            assert.isTrue(entry!.symbol.length > 0);
            assert.isTrue(entry!.description.length > 0);
        }
    });

    test("covers every card family tag", ({ assert }) => {
        assert.equal(CARD_FAMILY_GLOSSARY_ENTRIES.length, CARD_TAGS.length);

        for (const tag of CARD_TAGS) {
            const meta = CARD_TAG_LABELS[tag];
            const entry = CARD_FAMILY_GLOSSARY_ENTRIES.find(
                (family) => family.label === meta.label,
            );
            assert.isDefined(entry);
            assert.equal(entry!.symbol, meta.symbol);
        }
    });
});
