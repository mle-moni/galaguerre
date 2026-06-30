import { test } from "@japa/runner";
import { generateCardDescriptionFromData } from "#galaguerre/generate_card_description";
import { buildSyncedCardInsert } from "#database/seed_helpers/build_synced_card_insert";
import { GALADRIM_CARDS } from "#database/seed_data/cards/galadrim_cards";

const findCard = (id: number) => {
    const entry = GALADRIM_CARDS.find((card) => card.id === id);
    if (!entry) {
        throw new Error(`Missing galadrim card ${id}`);
    }
    return entry;
};

test.group("generate_card_description", () => {
    test("generates minion description with powers and battlecry", ({ assert }) => {
        const description = generateCardDescriptionFromData(findCard(65).data);

        assert.include(description, "Monstre 1/3");
        assert.include(description, "Provocation");
        assert.include(description, "Cri de guerre");
    });

    test("generates spell description with effect text", ({ assert }) => {
        const description = generateCardDescriptionFromData(findCard(96).data);

        assert.isTrue(description.length > 0);
        assert.include(description, "Effet");
    });

    test("generates weapon description with stats", ({ assert }) => {
        const description = generateCardDescriptionFromData(findCard(106).data);

        assert.equal(description, "Arme 1/4.");
    });

    test("buildSyncedCardInsert includes generatedDescription", ({ assert }) => {
        const entry = findCard(62);
        const insert = buildSyncedCardInsert(entry, 1);

        assert.isString(insert.generatedDescription);
        assert.isTrue(insert.generatedDescription.length > 0);
        assert.equal(insert.generatedDescription, generateCardDescriptionFromData(entry.data));
    });
});
