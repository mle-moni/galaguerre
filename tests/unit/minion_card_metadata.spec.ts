import { test } from "@japa/runner";
import { getMinionCardDescription } from "../../app/galaguerre/minion_card_metadata.js";

test.group("minion_card_metadata", () => {
    test("getMinionCardDescription includes minion power effect details", ({ assert }) => {
        const description = getMinionCardDescription(1, 2, ["Provocation"], []);

        assert.equal(
            description,
            "Serviteur 1/2. Les adversaires doivent attaquer ce serviteur avant les autres cibles.",
        );
    });

    test("getMinionCardDescription includes battlecry lines", ({ assert }) => {
        const description = getMinionCardDescription(
            2,
            2,
            [],
            ["Cri de guerre : Inflige 2 dégâts au héros adverse."],
        );

        assert.equal(
            description,
            "Serviteur 2/2. Cri de guerre : Inflige 2 dégâts au héros adverse.",
        );
    });

    test("getMinionCardDescription omits optional sections when empty", ({ assert }) => {
        const description = getMinionCardDescription(2, 1, [], []);

        assert.equal(description, "Serviteur 2/1.");
    });
});
