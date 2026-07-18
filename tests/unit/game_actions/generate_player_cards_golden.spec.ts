import { test } from "@japa/runner";
import { generatePlayerCards } from "#controllers/games/generate_player_cards";
import { defaultMinionData } from "#database/seed_data/cards/define_card";
import { createTestMinionCard } from "#tests/helpers/catalog_fixtures";

test.group("generatePlayerCards golden", () => {
    test("prefers golden copies when goldenCounts are available", ({ assert }) => {
        const card = createTestMinionCard({
            id: 181,
            label: "Nouvelle Recrue",
            data: {
                ...defaultMinionData(),
                name: "Nouvelle Recrue",
                goldenVideoUrl: "/card-videos/nouvelle-recrue.mp4",
            },
        });

        const playerCards = generatePlayerCards([card, card], {
            shuffle: false,
            goldenCounts: new Map([[181, 1]]),
        });

        assert.lengthOf(playerCards, 2);
        assert.isTrue(playerCards[0]!.isGolden);
        assert.isFalse(playerCards[1]!.isGolden);
        assert.equal(playerCards[0]!.goldenVideoUrl, "/card-videos/nouvelle-recrue.mp4");
        assert.equal(playerCards[1]!.goldenVideoUrl, "/card-videos/nouvelle-recrue.mp4");
    });

    test("marks all copies normal when no goldenCounts provided", ({ assert }) => {
        const card = createTestMinionCard({
            id: 10,
            data: {
                ...defaultMinionData(),
                goldenVideoUrl: "/card-videos/example.mp4",
            },
        });

        const [playerCard] = generatePlayerCards([card], { shuffle: false });
        assert.isFalse(playerCard!.isGolden);
    });
});
