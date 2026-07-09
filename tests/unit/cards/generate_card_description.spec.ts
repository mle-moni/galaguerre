import { test } from "@japa/runner";
import { generateCardDescriptionFromData } from "#galaguerre/generate_card_description";
import { buildSyncedCardInsert } from "#database/seed_helpers/build_synced_card_insert";
import { GALADRIM_CARDS } from "#database/seed_data/cards/galadrim_cards";
import { parseWeaponData } from "#galaguerre/card_definition.schema";

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

    test("generates weapon description with cannot attack hero restriction", ({ assert }) => {
        const description = generateCardDescriptionFromData(
            parseWeaponData({
                schemaVersion: 1,
                type: "WEAPON",
                tags: [],
                labelTags: [],
                name: "Agrafeuse Lourde",
                cost: 2,
                dynamicCost: null,
                imageUrl: "https://example.com/weapon.png",
                damage: 3,
                durability: 2,
                deathrattleActions: [],
                cannotAttackHero: true,
            }),
        );

        assert.equal(description, "Arme 3/2. Ne peut pas attaquer le héros adverse.");
    });

    test("generates spell description with label tag prefix", ({ assert }) => {
        const description = generateCardDescriptionFromData(findCard(167).data);

        assert.include(description, "Emoji");
        assert.include(description, "Effet : Détruit un monstre");
    });

    test("buildSyncedCardInsert includes generatedDescription", ({ assert }) => {
        const entry = findCard(62);
        const insert = buildSyncedCardInsert(entry, 1);

        assert.isString(insert.generatedDescription);
        assert.isTrue(insert.generatedDescription.length > 0);
        assert.equal(insert.generatedDescription, generateCardDescriptionFromData(entry.data));
    });
});
