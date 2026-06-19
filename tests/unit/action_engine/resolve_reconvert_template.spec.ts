import { test } from "@japa/runner";
import { resolveReconvertTemplate } from "#galaguerre/action_engine/resolve_reconvert_template";
import { getAllMinionCardTemplates } from "#galaguerre/card_catalog";
import {
    createComparisonSnapshot,
    createMinionCard,
    createMinionState,
    createReconvertParametersSnapshot,
} from "#tests/helpers/game/fixtures";

test.group("resolveReconvertTemplate", () => {
    test("returns fixed template when cardId is set", ({ assert }) => {
        const source = createMinionState(createMinionCard({ cost: 5 }));

        const template = resolveReconvertTemplate(
            createReconvertParametersSnapshot({ cardId: 121 }),
            source,
        );

        assert.isDefined(template);
        assert.equal(template!.cardId, 121);
        assert.equal(template!.label, "Légume");
    });

    test("filters catalog by absolute cost", ({ assert }) => {
        const source = createMinionState(createMinionCard({ cost: 8 }));
        const targetCost = 2;
        const expectedCardIds = getAllMinionCardTemplates()
            .filter((template) => template.cost === targetCost)
            .map((template) => template.cardId);

        const template = resolveReconvertTemplate(
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: targetCost,
                }),
            }),
            source,
        );

        assert.isDefined(template);
        assert.include(expectedCardIds, template!.cardId);
    });

    test("resolves relative cost from source minion stats", ({ assert }) => {
        const sourceCost = 5;
        const expectedCost = sourceCost - 1;
        const expectedCardIds = getAllMinionCardTemplates()
            .filter((template) => template.cost === expectedCost)
            .map((template) => template.cardId);

        const source = createMinionState(createMinionCard({ cost: sourceCost }));

        const template = resolveReconvertTemplate(
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: -1,
                }),
                relativeToSource: true,
            }),
            source,
        );

        assert.isDefined(template);
        assert.include(expectedCardIds, template!.cardId);
    });

    test("falls back to source cost when relative negative offset has no matches", ({ assert }) => {
        const sourceCost = 1;
        const expectedCardIds = getAllMinionCardTemplates()
            .filter((template) => template.cost === sourceCost)
            .map((template) => template.cardId);

        assert.isAbove(expectedCardIds.length, 0);

        const source = createMinionState(createMinionCard({ cost: sourceCost }));

        const template = resolveReconvertTemplate(
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: -1,
                }),
                relativeToSource: true,
            }),
            source,
        );

        assert.isDefined(template);
        assert.include(expectedCardIds, template!.cardId);
        assert.equal(template!.cost, sourceCost);
    });

    test("returns undefined when no minion matches", ({ assert }) => {
        const source = createMinionState(createMinionCard({ cost: 3 }));

        const template = resolveReconvertTemplate(
            createReconvertParametersSnapshot({
                comparison: createComparisonSnapshot({
                    costComparison: "=",
                    cost: 100,
                }),
            }),
            source,
        );

        assert.isUndefined(template);
    });

    test("filters catalog by tag only without cost comparison", ({ assert }) => {
        const source = createMinionState(createMinionCard({ cost: 6 }));
        const expectedCardIds = getAllMinionCardTemplates()
            .filter((template) => template.tags.includes("PM"))
            .map((template) => template.cardId);

        assert.isAbove(expectedCardIds.length, 1);

        const template = resolveReconvertTemplate(
            createReconvertParametersSnapshot({ tags: ["PM"] }),
            source,
        );

        assert.isDefined(template);
        assert.include(expectedCardIds, template!.cardId);
        assert.isTrue(template!.tags.includes("PM"));
    });
});
