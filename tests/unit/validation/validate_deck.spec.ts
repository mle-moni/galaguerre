import { test } from "@japa/runner";
import testUtils from "@adonisjs/core/services/test_utils";
import { createGame } from "#controllers/games/create_game";
import Action from "#models/action";
import Boost from "#models/boost";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import Minion from "#models/minion";
import MinionBattlecryAction from "#models/minion_battlecry_action";
import MinionPassive from "#models/minon_passive";
import Passive from "#models/passive";
import Spell from "#models/spell";
import Target from "#models/target";
import ToolToTarget from "#models/tool_to_target";
import User from "#models/user";
import Weapon from "#models/weapon";
import WeaponDeathrattleAction from "#models/weapon_deathrattle_action";
import {
    DeckValidationError,
    validateDeck,
} from "../../../app/galaguerre/validation/validate_deck.js";

const nullActionFields = {
    drawCount: null,
    drawCardFilterId: null,
    enemyDrawCount: null,
    enemyDrawCardFilterId: null,
    damage: null,
    heal: null,
    boostId: null,
};

const preloadBoostRelations = (bq: {
    preload: (relation: string, callback?: (sq: any) => void) => void;
}) => {
    bq.preload("minionPower").preload("toolToTargets", (tq: any) =>
        tq.preload("target", (targetQ: any) => targetQ.preload("comparison")),
    );
};

const preloadActionRelations = (aq: {
    preload: (relation: string, callback?: (sq: any) => void) => void;
}) => {
    aq.preload("boost", preloadBoostRelations);
    aq.preload("drawCardFilter", (cfq: any) => cfq.preload("comparison").preload("tags"));
    aq.preload("enemyDrawCardFilter", (cfq: any) => cfq.preload("comparison").preload("tags"));
    aq.preload("toolToTargets", (tq: any) =>
        tq.preload("target", (targetQ: any) => targetQ.preload("comparison")),
    );
};

const loadDeckRelations = async (deck: Deck) => {
    await deck.load("cards", (query) =>
        query
            .preload("minion", (q) =>
                q
                    .preload("minionPower")
                    .preload("battlecryActions", (q) =>
                        q.preload("action", preloadActionRelations).orderBy("id", "asc"),
                    )
                    .preload("passives", (pq) =>
                        pq.preload("passive", (passiveQ) =>
                            passiveQ
                                .preload("action", preloadActionRelations)
                                .preload("boost", preloadBoostRelations),
                        ),
                    ),
            )
            .preload("spell", (sq) => sq.preload("action", preloadActionRelations))
            .preload("weapon", (wq) =>
                wq.preload("deathrattleActions", (q) =>
                    q.preload("action", preloadActionRelations).orderBy("id", "asc"),
                ),
            ),
    );
};

const createMinionCardInDeck = async ({
    deck,
    unique,
    label,
    action,
    target,
}: {
    deck: Deck;
    unique: string;
    label: string;
    action?: {
        internalLabel: string;
        type: "DAMAGE" | "HEAL" | "DRAW" | "ENEMY_DRAW" | "BOOST" | "MINION_POWERS";
        isTargeted?: boolean;
        damage?: number | null;
        heal?: number | null;
        drawCount?: number | null;
        enemyDrawCount?: number | null;
        boost?: {
            attack?: number | null;
            health?: number | null;
            spellPower?: number | null;
        };
    };
    target?: {
        type: "HERO" | "MINION" | "ALL";
        targetTeam: "PLAYER" | "OPPONENT" | "ALL";
    };
}) => {
    const minion = await Minion.create({
        internalLabel: `${label}-minion-${unique}`,
        attack: 1,
        health: 1,
    });

    if (action) {
        let boostId: number | null = null;

        if (action.boost) {
            const boost = await Boost.create({
                internalLabel: `${label}-boost-${unique}`,
                attack: action.boost.attack ?? null,
                health: action.boost.health ?? null,
                spellPower: action.boost.spellPower ?? null,
                minionPowerId: null,
            });
            boostId = boost.id;
        }

        const createdAction = await Action.create({
            internalLabel: action.internalLabel,
            type: action.type,
            isTargeted: action.isTargeted ?? false,
            ...nullActionFields,
            damage: action.damage ?? null,
            heal: action.heal ?? null,
            drawCount: action.drawCount ?? null,
            enemyDrawCount: action.enemyDrawCount ?? null,
            boostId,
        });

        if (target) {
            const createdTarget = await Target.create({
                internalLabel: `${label}-target-${unique}`,
                type: target.type,
                targetTeam: target.targetTeam,
                comparisonId: null,
                tagId: null,
            });

            await ToolToTarget.create({
                targetId: createdTarget.id,
                actionId: createdAction.id,
                boostId: null,
            });
        }

        await MinionBattlecryAction.create({
            minionId: minion.id,
            actionId: createdAction.id,
        });
    }

    const card = await Card.create({
        label,
        imageUrl: "https://example.com/card.png",
        cost: 1,
        type: "MINION",
        cardMode: "BETA",
        minionId: minion.id,
        spellId: null,
        weaponId: null,
    });

    await DeckCard.create({ deckId: deck.id, cardId: card.id });

    return card;
};

const createDeckForUser = async (userId: number, unique: string) => {
    const deck = await Deck.create({
        name: `Validation deck ${unique}`,
        userId,
        selected: true,
    });

    await createMinionCardInDeck({
        deck,
        unique,
        label: `valid-card-${unique}`,
    });

    await loadDeckRelations(deck);
    return deck;
};

test.group("validation:validateDeck", (group) => {
    group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

    test("accepts deck with minions without battlecries", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-valid-${unique}@test.fr`,
            password: "test",
        });

        const deck = await createDeckForUser(user.id, unique);
        const result = validateDeck(deck);

        assert.isTrue(result.valid);
        assert.equal(result.errors.length, 0);
    });

    test("accepts deck with correctly linked battlecries", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-bc-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Battlecry deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `bc-damage-${unique}`,
            action: {
                internalLabel: `bc-damage-action-${unique}`,
                type: "DAMAGE",
                damage: 2,
            },
            target: { type: "HERO", targetTeam: "OPPONENT" },
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `bc-heal-${unique}`,
            action: {
                internalLabel: `bc-heal-action-${unique}`,
                type: "HEAL",
                heal: 3,
            },
            target: { type: "HERO", targetTeam: "PLAYER" },
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `bc-draw-${unique}`,
            action: {
                internalLabel: `bc-draw-action-${unique}`,
                type: "DRAW",
                drawCount: 1,
            },
        });

        await loadDeckRelations(deck);
        const result = validateDeck(deck);

        assert.isTrue(result.valid);
        assert.equal(result.errors.length, 0);
    });

    test("rejects DAMAGE action without tool_to_target", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-dmg-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Invalid damage deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `invalid-damage-${unique}`,
            action: {
                internalLabel: `invalid-damage-action-${unique}`,
                type: "DAMAGE",
                damage: 2,
            },
        });

        await loadDeckRelations(deck);
        const result = validateDeck(deck);

        assert.isFalse(result.valid);
        assert.equal(result.errors.length, 1);
        assert.include(
            result.errors[0]!.reason,
            "DAMAGE action requires a HERO or MINION target via tool_to_target",
        );
    });

    test("rejects HEAL action without tool_to_target", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-heal-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Invalid heal deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `invalid-heal-${unique}`,
            action: {
                internalLabel: `invalid-heal-action-${unique}`,
                type: "HEAL",
                heal: 3,
            },
        });

        await loadDeckRelations(deck);
        const result = validateDeck(deck);

        assert.isFalse(result.valid);
        assert.equal(result.errors.length, 1);
        assert.include(
            result.errors[0]!.reason,
            "HEAL action requires a HERO or MINION target via tool_to_target",
        );
    });

    test("accepts DAMAGE action with MINION target", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-minion-target-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Valid minion target deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `valid-minion-target-${unique}`,
            action: {
                internalLabel: `valid-minion-target-action-${unique}`,
                type: "DAMAGE",
                damage: 2,
            },
            target: { type: "MINION", targetTeam: "OPPONENT" },
        });

        await loadDeckRelations(deck);
        const result = validateDeck(deck);

        assert.isTrue(result.valid);
        assert.equal(result.errors.length, 0);
    });

    test("rejects BOOST action without boostId", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-boost-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Invalid boost deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `invalid-boost-${unique}`,
            action: {
                internalLabel: `invalid-boost-action-${unique}`,
                type: "BOOST",
            },
            target: {
                type: "MINION",
                targetTeam: "PLAYER",
            },
        });

        await loadDeckRelations(deck);
        const result = validateDeck(deck);

        assert.isFalse(result.valid);
        assert.equal(result.errors.length, 1);
        assert.include(result.errors[0]!.reason, "BOOST action requires boostId");
    });

    test("accepts valid BOOST action", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-valid-boost-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Valid boost deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `valid-boost-${unique}`,
            action: {
                internalLabel: `valid-boost-action-${unique}`,
                type: "BOOST",
                isTargeted: true,
                boost: { attack: 2, health: 2 },
            },
            target: {
                type: "MINION",
                targetTeam: "PLAYER",
            },
        });

        await loadDeckRelations(deck);
        const result = validateDeck(deck);

        assert.isTrue(result.valid);
        assert.equal(result.errors.length, 0);
    });

    test("accepts valid isTargeted DAMAGE action", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-targeted-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Valid targeted deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `valid-targeted-${unique}`,
            action: {
                internalLabel: `valid-targeted-action-${unique}`,
                type: "DAMAGE",
                isTargeted: true,
                damage: 2,
            },
            target: { type: "HERO", targetTeam: "OPPONENT" },
        });

        await loadDeckRelations(deck);
        const result = validateDeck(deck);

        assert.isTrue(result.valid);
        assert.equal(result.errors.length, 0);
    });

    test("rejects isTargeted DRAW action", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-targeted-draw-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Invalid targeted draw deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `invalid-targeted-draw-${unique}`,
            action: {
                internalLabel: `invalid-targeted-draw-action-${unique}`,
                type: "DRAW",
                isTargeted: true,
                drawCount: 1,
            },
            target: { type: "HERO", targetTeam: "OPPONENT" },
        });

        await loadDeckRelations(deck);
        const result = validateDeck(deck);

        assert.isFalse(result.valid);
        assert.equal(result.errors.length, 1);
        assert.include(result.errors[0]!.reason, "Targeted action type DRAW is not supported");
    });

    test("rejects isTargeted action without target", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-targeted-notarget-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Invalid targeted no target deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck,
            unique,
            label: `invalid-targeted-notarget-${unique}`,
            action: {
                internalLabel: `invalid-targeted-notarget-action-${unique}`,
                type: "DAMAGE",
                isTargeted: true,
                damage: 2,
            },
        });

        await loadDeckRelations(deck);
        const result = validateDeck(deck);

        assert.isFalse(result.valid);
        assert.equal(result.errors.length, 1);
        assert.include(
            result.errors[0]!.reason,
            "Targeted action requires a HERO or MINION target via tool_to_target",
        );
    });

    test("accepts valid SPELL card in deck", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-spell-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Valid spell deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        const damageAction = await Action.create({
            internalLabel: `spell-damage-action-${unique}`,
            type: "DAMAGE",
            isTargeted: false,
            ...nullActionFields,
            damage: 3,
        });

        const enemyHeroTarget = await Target.create({
            internalLabel: `spell-enemy-hero-${unique}`,
            type: "HERO",
            targetTeam: "OPPONENT",
            comparisonId: null,
            tagId: null,
        });

        await ToolToTarget.create({
            targetId: enemyHeroTarget.id,
            actionId: damageAction.id,
            boostId: null,
        });

        const spell = await Spell.create({
            internalLabel: `spell-${unique}`,
            actionId: damageAction.id,
        });

        const card = await Card.create({
            label: `spell-card-${unique}`,
            imageUrl: "https://example.com/spell.png",
            cost: 2,
            type: "SPELL",
            cardMode: "BETA",
            minionId: null,
            spellId: spell.id,
            weaponId: null,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });
        await loadDeckRelations(deck);

        const result = validateDeck(deck);

        assert.isTrue(result.valid);
        assert.equal(result.errors.length, 0);
    });

    test("accepts SPELL card with mass minion damage", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-spell-mass-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Valid mass spell deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        const damageAction = await Action.create({
            internalLabel: `spell-mass-damage-action-${unique}`,
            type: "DAMAGE",
            isTargeted: false,
            ...nullActionFields,
            damage: 1,
        });

        const enemyMinionsTarget = await Target.create({
            internalLabel: `spell-enemy-minions-${unique}`,
            type: "MINION",
            targetTeam: "OPPONENT",
            comparisonId: null,
            tagId: null,
        });

        await ToolToTarget.create({
            targetId: enemyMinionsTarget.id,
            actionId: damageAction.id,
            boostId: null,
        });

        const spell = await Spell.create({
            internalLabel: `spell-mass-${unique}`,
            actionId: damageAction.id,
        });

        const card = await Card.create({
            label: `spell-mass-card-${unique}`,
            imageUrl: "https://example.com/spell.png",
            cost: 2,
            type: "SPELL",
            cardMode: "BETA",
            minionId: null,
            spellId: spell.id,
            weaponId: null,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });
        await loadDeckRelations(deck);

        const result = validateDeck(deck);

        assert.isTrue(result.valid);
        assert.equal(result.errors.length, 0);
    });

    test("accepts WEAPON card with valid deathrattle", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-weapon-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Valid weapon deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        const drawAction = await Action.create({
            internalLabel: `weapon-dr-draw-action-${unique}`,
            type: "DRAW",
            isTargeted: false,
            ...nullActionFields,
            drawCount: 1,
        });

        const weapon = await Weapon.create({
            internalLabel: `weapon-${unique}`,
            damage: 2,
            durability: 3,
        });

        await WeaponDeathrattleAction.create({
            weaponId: weapon.id,
            actionId: drawAction.id,
        });

        const card = await Card.create({
            label: `weapon-card-${unique}`,
            imageUrl: "https://example.com/weapon.png",
            cost: 3,
            type: "WEAPON",
            cardMode: "BETA",
            minionId: null,
            spellId: null,
            weaponId: weapon.id,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });
        await loadDeckRelations(deck);

        const result = validateDeck(deck);

        assert.isTrue(result.valid);
        assert.equal(result.errors.length, 0);
    });

    test("rejects WEAPON card without weapon entity", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-weapon-missing-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Invalid weapon deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        const card = await Card.create({
            label: `weapon-card-${unique}`,
            imageUrl: "https://example.com/weapon.png",
            cost: 3,
            type: "WEAPON",
            cardMode: "BETA",
            minionId: null,
            spellId: null,
            weaponId: null,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });
        await loadDeckRelations(deck);

        const result = validateDeck(deck);

        assert.isFalse(result.valid);
        assert.equal(result.errors.length, 1);
        assert.include(result.errors[0]!.reason, "weapon not found");
    });

    test("rejects SPELL card without spell entity", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const user = await User.create({
            email: `vd-spell-missing-${unique}@test.fr`,
            password: "test",
        });

        const deck = await Deck.create({
            name: `Invalid spell deck ${unique}`,
            userId: user.id,
            selected: true,
        });

        const card = await Card.create({
            label: `spell-card-${unique}`,
            imageUrl: "https://example.com/spell.png",
            cost: 2,
            type: "SPELL",
            cardMode: "BETA",
            minionId: null,
            spellId: null,
            weaponId: null,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });
        await loadDeckRelations(deck);

        const result = validateDeck(deck);

        assert.isFalse(result.valid);
        assert.equal(result.errors.length, 1);
        assert.include(result.errors[0]!.reason, "spell not found");
    });

    test("createGame rejects deck with invalid cards", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const playerOne = await User.create({
            email: `vd-cg-p1-${unique}@test.fr`,
            password: "test",
        });
        const playerTwo = await User.create({
            email: `vd-cg-p2-${unique}@test.fr`,
            password: "test",
        });

        const validDeck = await createDeckForUser(playerOne.id, `${unique}-valid`);

        const invalidDeck = await Deck.create({
            name: `Invalid deck ${unique}`,
            userId: playerTwo.id,
            selected: true,
        });

        await createMinionCardInDeck({
            deck: invalidDeck,
            unique,
            label: `invalid-damage-${unique}`,
            action: {
                internalLabel: `invalid-damage-action-${unique}`,
                type: "DAMAGE",
                damage: 2,
            },
        });

        await loadDeckRelations(invalidDeck);

        try {
            await createGame({
                playerOne: {
                    userId: playerOne.id,
                    pseudo: "Player One",
                    deck: validDeck,
                },
                playerTwo: {
                    userId: playerTwo.id,
                    pseudo: "Player Two",
                    deck: invalidDeck,
                },
            });
            assert.fail("Expected createGame to throw DeckValidationError");
        } catch (error) {
            assert.instanceOf(error, DeckValidationError);
            if (!(error instanceof DeckValidationError)) return;
            assert.isAbove(error.errors.length, 0);
            assert.include(
                error.errors[0]!.reason,
                "DAMAGE action requires a HERO or MINION target via tool_to_target",
            );
        }
    });

    test("rejects ACTION passive without triggersOn", async ({ assert }) => {
        const user = await User.create({
            email: `passive-no-trigger-${Date.now()}@test.com`,
            password: "password",
        });
        const deck = await Deck.create({
            name: "Passive deck",
            userId: user.id,
            selected: true,
        });

        const minion = await Minion.create({
            internalLabel: "passive-minion",
            attack: 1,
            health: 1,
        });

        const action = await Action.create({
            internalLabel: "passive-action",
            type: "DAMAGE",
            isTargeted: false,
            ...nullActionFields,
            damage: 1,
        });

        const passive = await Passive.create({
            internalLabel: "passive-no-trigger",
            type: "ACTION",
            triggersOn: null,
            actionId: action.id,
            boostId: null,
        });

        await MinionPassive.create({
            minionId: minion.id,
            passiveId: passive.id,
        });

        const card = await Card.create({
            label: "Passive Card",
            imageUrl: "https://example.com/card.png",
            cost: 1,
            type: "MINION",
            cardMode: "BETA",
            minionId: minion.id,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });
        await loadDeckRelations(deck);

        const result = validateDeck(deck);
        assert.isFalse(result.valid);
        assert.include(result.errors[0]!.reason, "ACTION passive requires triggersOn");
    });

    test("rejects BOOST passive without tool_to_target", async ({ assert }) => {
        const user = await User.create({
            email: `passive-no-target-${Date.now()}@test.com`,
            password: "password",
        });
        const deck = await Deck.create({
            name: "Passive boost deck",
            userId: user.id,
            selected: true,
        });

        const minion = await Minion.create({
            internalLabel: "passive-boost-minion",
            attack: 1,
            health: 1,
        });

        const boost = await Boost.create({
            internalLabel: "passive-boost",
            attack: 1,
            health: 1,
            spellPower: null,
            minionPowerId: null,
        });

        const passive = await Passive.create({
            internalLabel: "passive-boost-no-target",
            type: "BOOST",
            triggersOn: null,
            actionId: null,
            boostId: boost.id,
        });

        await MinionPassive.create({
            minionId: minion.id,
            passiveId: passive.id,
        });

        const card = await Card.create({
            label: "Passive Boost Card",
            imageUrl: "https://example.com/card.png",
            cost: 1,
            type: "MINION",
            cardMode: "BETA",
            minionId: minion.id,
        });

        await DeckCard.create({ deckId: deck.id, cardId: card.id });
        await loadDeckRelations(deck);

        const result = validateDeck(deck);
        assert.isFalse(result.valid);
        assert.include(
            result.errors[0]!.reason,
            "BOOST passive requires a HERO or MINION target via tool_to_target",
        );
    });
});
