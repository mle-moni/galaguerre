import type { MinionCard, PlayerCard, SpellCard } from "#api_types/game.types";
import { test } from "@japa/runner";
import type Game from "#models/game";
import { instantiateDeckCard } from "#galaguerre/deck_card_operations";
import { resolveDiscoverChoice } from "#galaguerre/discover/resolve_discover_choice";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createEmptyBoard,
    createGameData,
    createMinionCard,
    createMinionState,
    placeMinion,
} from "#tests/helpers/game/fixtures";
import { assertBoardIndex, assertPlayerHealth } from "#tests/helpers/game/assertions";
import { runPlayMinion, runPlaySpell } from "#tests/helpers/game/run_play_minion";

const DEVOPS_EN_SUEUR_ID = 119;
const ALTERNANT_SURMOTIVE_ID = 117;
const BUG_EN_PROD_ID = 97;
const RECHERCHE_GOOGLE_ID = 149;
const PAUSE_CAFE_ID = 96;
const DISTRIBUTEUR_DE_CROQUETTES_ID = 118;

const instantiateCard = (cardId: number, uuid: string): PlayerCard => {
    const card = instantiateDeckCard(cardId);
    if (!card) throw new Error(`Card ${cardId} not found in the catalog`);
    return { ...card, uuid };
};

const instantiateMinion = (cardId: number, uuid: string): MinionCard => {
    const card = instantiateCard(cardId, uuid);
    if (card.type !== "MINION") throw new Error(`Card ${cardId} is not a minion`);
    return card;
};

const instantiateSpell = (cardId: number, uuid: string): SpellCard => {
    const card = instantiateCard(cardId, uuid);
    if (card.type !== "SPELL") throw new Error(`Card ${cardId} is not a spell`);
    return card;
};

const devopsEnSueur = (uuid = "devops-en-sueur") => instantiateMinion(DEVOPS_EN_SUEUR_ID, uuid);

const chooseFirstDiscoverOption = (
    game: Game,
    playerKey: "playerOne" | "playerTwo" = "playerOne",
) => {
    const pending = game.data.pendingDiscover;
    if (!pending) throw new Error("No pending discover");
    return resolveDiscoverChoice(game, game.data[playerKey], pending.options[0]!.uuid);
};

test.group("DevOps en Sueur (Wild Pyromancer)", () => {
    test("deals 1 damage to every minion after a spell is cast", async ({ assert }) => {
        const pauseCafe = instantiateSpell(PAUSE_CAFE_ID, "pause-cafe");
        const ally = createMinionCard({ uuid: "ally", health: 4 });
        const enemy = createMinionCard({ uuid: "enemy", health: 4 });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [pauseCafe],
                    board: placeMinion(
                        placeMinion(createEmptyBoard(), 0, createMinionState(devopsEnSueur())),
                        1,
                        createMinionState(ally),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(enemy)),
                },
            }),
            pauseCafe,
        );

        // Pause Café gives +1/+1 to allies (4 -> 5 health), then DevOps hits every minion.
        assertBoardIndex(assert, game, "playerOne", 0, { health: 2 }); // 3/2 +1/+1 -1
        assertBoardIndex(assert, game, "playerOne", 1, { health: 4 });
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 3 });
    });

    test("still triggers when the spell that casts it kills it (Bug en Prod)", async ({
        assert,
    }) => {
        const bugEnProd = instantiateSpell(BUG_EN_PROD_ID, "bug-en-prod");
        const survivor = createMinionCard({ uuid: "survivor", health: 6 });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [bugEnProd],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(devopsEnSueur())),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(survivor)),
                },
            }),
            bugEnProd,
        );

        // The 3/2 DevOps dies to the 3 damage, but its queued trigger still resolves: 3 + 1.
        assert.lengthOf(game.data.playerOne.board, 0);
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 2 });
    });

    test("two DevOps killed by the same spell both trigger", async ({ assert }) => {
        const bugEnProd = instantiateSpell(BUG_EN_PROD_ID, "bug-en-prod");
        const survivor = createMinionCard({ uuid: "survivor", health: 8 });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [bugEnProd],
                    board: placeMinion(
                        placeMinion(
                            createEmptyBoard(),
                            0,
                            createMinionState(devopsEnSueur("devops-a")),
                        ),
                        1,
                        createMinionState(devopsEnSueur("devops-b")),
                    ),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(survivor)),
                },
            }),
            bugEnProd,
        );

        assert.lengthOf(game.data.playerOne.board, 0);
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 3 }); // 8 - 3 - 1 - 1
    });

    test("triggers on a discover spell once the card is chosen (Recherche Google)", async ({
        assert,
    }) => {
        const rechercheGoogle = instantiateSpell(RECHERCHE_GOOGLE_ID, "recherche-google");
        const enemy = createMinionCard({ uuid: "enemy", health: 4 });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [rechercheGoogle],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(devopsEnSueur())),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(enemy)),
                },
            }),
            rechercheGoogle,
        );

        // The discover pauses the play: nothing has triggered yet.
        assert.isDefined(game.data.pendingDiscover);
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 4 });

        const { gameEnded, discoverPending } = chooseFirstDiscoverOption(game);

        assert.isFalse(gameEnded);
        assert.isFalse(discoverPending);
        assert.isUndefined(game.data.pendingCardPlay);
        assertBoardIndex(assert, game, "playerOne", 0, { health: 1 });
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 3 });
    });

    test("a discover spell counts for combo once resolved", async ({ assert }) => {
        const rechercheGoogle = instantiateSpell(RECHERCHE_GOOGLE_ID, "recherche-google");

        const { game } = await runPlaySpell(
            createGameData({ playerOne: { mana: 10, hand: [rechercheGoogle] } }),
            rechercheGoogle,
        );

        assert.equal(game.data.playerOne.cardsPlayedThisTurn, 0);

        chooseFirstDiscoverOption(game);

        assert.equal(game.data.playerOne.cardsPlayedThisTurn, 1);
    });

    test("does not trigger on the opponent's spells", async ({ assert }) => {
        const pauseCafe = instantiateSpell(PAUSE_CAFE_ID, "pause-cafe");
        const enemy = createMinionCard({ uuid: "enemy", health: 4 });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(devopsEnSueur())),
                },
                playerTwo: {
                    mana: 10,
                    hand: [pauseCafe],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(enemy)),
                },
            }),
            pauseCafe,
            undefined,
            "playerTwo",
        );

        assertBoardIndex(assert, game, "playerOne", 0, { health: 2 });
        assertBoardIndex(assert, game, "playerTwo", 0, { health: 5 });
    });

    test("does not trigger when a minion is played", async ({ assert }) => {
        const playedMinion = createMinionCard({ uuid: "played-minion", cost: 1, health: 3 });

        const { game } = await runPlayMinion(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [playedMinion],
                    board: placeMinion(createEmptyBoard(), 1, createMinionState(devopsEnSueur())),
                },
            }),
            playedMinion,
            { boardIndex: 0 },
        );

        assertBoardIndex(assert, game, "playerOne", 0, { health: 3 });
        assertBoardIndex(assert, game, "playerOne", 1, { health: 2 });
    });

    test("does not trigger if it enters the board during the spell it would react to", async ({
        assert,
    }) => {
        const rechercheGoogle = instantiateSpell(RECHERCHE_GOOGLE_ID, "recherche-google");
        const enemy = createMinionCard({ uuid: "enemy", health: 4 });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: { mana: 10, hand: [rechercheGoogle] },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(enemy)),
                },
            }),
            rechercheGoogle,
        );

        // Summoned while the spell is paused on its discover.
        game.data.playerOne.board.push(createMinionState(devopsEnSueur()));

        chooseFirstDiscoverOption(game);

        assertBoardIndex(assert, game, "playerTwo", 0, { health: 4 });
    });

    test("the spell damage bonus does not scale the passive damage", async ({ assert }) => {
        const pauseCafe = instantiateSpell(PAUSE_CAFE_ID, "pause-cafe");
        const enemy = createMinionCard({ uuid: "enemy", health: 5 });

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    spellPower: 3,
                    hand: [pauseCafe],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(devopsEnSueur())),
                },
                playerTwo: {
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(enemy)),
                },
            }),
            pauseCafe,
        );

        assertBoardIndex(assert, game, "playerTwo", 0, { health: 4 });
    });

    test("never damages heroes", async ({ assert }) => {
        const pauseCafe = instantiateSpell(PAUSE_CAFE_ID, "pause-cafe");

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    health: 20,
                    hand: [pauseCafe],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(devopsEnSueur())),
                },
                playerTwo: { health: 20 },
            }),
            pauseCafe,
        );

        assertPlayerHealth(assert, game, "playerOne", 20);
        assertPlayerHealth(assert, game, "playerTwo", 20);
    });
});

test.group("card play passives queued across a discover", () => {
    test("Alternant Surmotivé gains +1 attack from a discover spell", async ({ assert }) => {
        const rechercheGoogle = instantiateSpell(RECHERCHE_GOOGLE_ID, "recherche-google");
        const alternant = instantiateMinion(ALTERNANT_SURMOTIVE_ID, "alternant-surmotive");

        const { game } = await runPlaySpell(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [rechercheGoogle],
                    board: placeMinion(createEmptyBoard(), 0, createMinionState(alternant)),
                },
            }),
            rechercheGoogle,
        );

        assertBoardIndex(assert, game, "playerOne", 0, { attack: 1 });

        chooseFirstDiscoverOption(game);

        assertBoardIndex(assert, game, "playerOne", 0, { attack: 2 });
    });

    test("SUMMON passives resolve after a battlecry discover", async ({ assert }) => {
        const distributeur = instantiateMinion(
            DISTRIBUTEUR_DE_CROQUETTES_ID,
            "distributeur-de-croquettes",
        );
        const pet = createMinionCard({
            uuid: "pet-with-discover",
            cost: 1,
            tags: ["PETS"],
            battlecryActions: [
                createCardActionSnapshot({
                    type: "DISCOVER",
                    discoverCardFilter: createCardFilterSnapshot({ type: "MINION" }),
                    optionCount: 3,
                }),
            ],
        });

        const { game } = await runPlayMinion(
            createGameData({
                playerOne: {
                    mana: 10,
                    hand: [pet],
                    deckCards: [instantiateCard(PAUSE_CAFE_ID, "deck-card")],
                    board: placeMinion(createEmptyBoard(), 1, createMinionState(distributeur)),
                },
            }),
            pet,
            { boardIndex: 0 },
        );

        // "Distributeur de Croquettes" draws when a PETS minion is summoned: still pending here.
        assert.isDefined(game.data.pendingDiscover);
        assert.lengthOf(game.data.playerOne.deckCards, 1);

        chooseFirstDiscoverOption(game);

        assert.lengthOf(game.data.playerOne.deckCards, 0);
        assert.equal(game.data.playerOne.cardsPlayedThisTurn, 1);
    });
});
