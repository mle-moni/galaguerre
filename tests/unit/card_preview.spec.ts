import { test } from "@japa/runner";
import { getCardPreviewById, getMinionCardTemplateById } from "#api_types/card_preview";
import { formatActionDescription } from "#api_types/format_action_description";
import {
    createCardActionSnapshot,
    createMinionTargetSnapshot,
    createReconvertParametersSnapshot,
} from "#tests/helpers/game/fixtures";

test.group("card_preview", () => {
    test("returns Légume preview by card id", ({ assert }) => {
        const card = getCardPreviewById(121);

        assert.isDefined(card);
        assert.equal(card?.type, "MINION");
        assert.equal(card?.label, "Légume");
        assert.equal(card?.cost, 1);
        if (card?.type === "MINION") {
            assert.equal(card.attack, 1);
            assert.equal(card.health, 1);
        }
    });

    test("getMinionCardTemplateById returns minion previews only", ({ assert }) => {
        assert.isDefined(getMinionCardTemplateById(121));
        assert.isUndefined(getMinionCardTemplateById(122));
    });
});

test.group("format_action_description reconversion card label", () => {
    test("formats Doom scrolling reconversion with Légume label", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "RECONVERSION",
            isTargeted: true,
            target: createMinionTargetSnapshot("ALL"),
            reconvertParameters: createReconvertParametersSnapshot({ cardId: 121 }),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Reconvertit un monstre en Légume.",
        );
    });
});
