import { test } from "@japa/runner";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateCardsMd } from "../../../scripts/generate_cards_md.js";

const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "../../../cards.md");

test.group("generate_cards_md", () => {
    test("writes cards.md from card templates", ({ assert }) => {
        const count = generateCardsMd();
        const content = readFileSync(OUTPUT, "utf8");

        assert.isTrue(count > 0);
        assert.include(content, "# Catalogue des cartes Galaguerre");
    });
});
