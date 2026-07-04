import GameInvitesController from "#controllers/game_invites/game_invites_controller";
import { createTrainingGame } from "#controllers/games/create_training_game";
import { gameSearch } from "#controllers/games/game_search";
import type { CreateGameInviteResponse } from "#api_types/game_invite.types";
import type { GameSearchResponse } from "#api_types/matchmaking.types";
import { parseMinionData } from "#galaguerre/card_definition.schema";
import Card from "#models/card";
import Deck from "#models/deck";
import DeckCard from "#models/deck_card";
import Friendship from "#models/friendship";
import Game from "#models/game";
import GameInvite from "#models/game_invite";
import User from "#models/user";
import { touchPresence } from "#services/presence/presence";
import { MATCHMAKING_QUEUE } from "#services/sockets/matchmaking";
import testUtils from "@adonisjs/core/services/test_utils";
import type { HttpContext } from "@adonisjs/core/http";
import { test } from "@japa/runner";
import { getActiveCardSetId } from "#tests/helpers/card_set";
import { defaultMinionData } from "#database/seed_data/cards/define_card";
import { syncCards } from "#database/seed_helpers/sync_cards";
import { DateTime } from "luxon";

const isErrorResponse = (value: unknown): value is { error: string } =>
    typeof value === "object" && value !== null && "error" in value;

const expectResult = <T extends object>(value: unknown): T => {
    if (value === undefined || value === null) {
        throw new Error("Expected controller result");
    }

    if (isErrorResponse(value)) {
        throw new Error(`Expected controller result, got error: ${value.error}`);
    }

    return value as T;
};

const createContext = (
    user: User,
    {
        body = {},
        params = {},
    }: {
        body?: Record<string, unknown>;
        params?: Record<string, unknown>;
    } = {},
) => {
    let badRequestBody: unknown;
    let forbiddenBody: unknown;
    let notFoundBody: unknown;

    const ctx = {
        auth: { user },
        request: {
            validateUsing: async () => body,
        },
        params,
        response: {
            badRequest: (payload: unknown) => {
                badRequestBody = payload;
                return payload;
            },
            forbidden: (payload: unknown) => {
                forbiddenBody = payload;
                return payload;
            },
            notFound: (payload: unknown) => {
                notFoundBody = payload;
                return payload;
            },
        },
    } as unknown as HttpContext;

    return {
        ctx,
        getBadRequestBody: () => badRequestBody,
        getForbiddenBody: () => forbiddenBody,
        getNotFoundBody: () => notFoundBody,
    };
};

const createUser = async (suffix: string, pseudo: string) =>
    User.create({
        email: `game-invite-${suffix}@test.fr`,
        password: "test",
        pseudo,
    });

const createMutualFriendship = async (userAId: number, userBId: number) => {
    await Friendship.create({ userId: userAId, friendId: userBId });
    await Friendship.create({ userId: userBId, friendId: userAId });
};

const createValidDeckForUser = async (userId: number, labelPrefix: string) => {
    const deck = await Deck.create({
        name: `Invite deck ${labelPrefix}`,
        userId,
        selected: true,
    });

    for (let index = 0; index < 15; index++) {
        const card = await Card.create({
            cardSetId: await getActiveCardSetId(),
            data: parseMinionData({
                ...defaultMinionData(),
                name: `${labelPrefix}-card-${index}`,
            }),
            isCollectible: true,
        });

        await DeckCard.create({
            deckId: deck.id,
            cardId: card.id,
        });
        await DeckCard.create({
            deckId: deck.id,
            cardId: card.id,
        });
    }

    await deck.load("cards", (query) => query.preload("cardSet"));

    return deck;
};

test.group("game invites", (group) => {
    group.each.setup(() => {
        MATCHMAKING_QUEUE.length = 0;
        return testUtils.db().wrapInGlobalTransaction();
    });

    test("sends an invite between mutual online friends", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const inviter = await createUser(`inviter-${unique}`, `Inviter-${unique}`);
        const invitee = await createUser(`invitee-${unique}`, `Invitee-${unique}`);

        await createMutualFriendship(inviter.id, invitee.id);
        await createValidDeckForUser(inviter.id, `inviter-${unique}`);
        await touchPresence(invitee.id);

        const controller = new GameInvitesController();
        const { ctx } = createContext(inviter, { body: { toUserId: invitee.id } });
        const response = expectResult<CreateGameInviteResponse>(await controller.store(ctx));

        assert.equal(response.invite.toUserId, invitee.id);

        const invite = await GameInvite.query().where("fromUserId", inviter.id).first();
        assert.isNotNull(invite);
        assert.equal(invite!.toUserId, invitee.id);
    });

    test("decline removes the invite", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const inviter = await createUser(`inviter-decline-${unique}`, `InviterDecline-${unique}`);
        const invitee = await createUser(`invitee-decline-${unique}`, `InviteeDecline-${unique}`);

        await createMutualFriendship(inviter.id, invitee.id);
        await createValidDeckForUser(inviter.id, `inviter-decline-${unique}`);
        await touchPresence(invitee.id);

        const controller = new GameInvitesController();
        const { ctx: storeCtx } = createContext(inviter, { body: { toUserId: invitee.id } });
        await controller.store(storeCtx);

        const invite = await GameInvite.query().where("fromUserId", inviter.id).firstOrFail();
        const { ctx: destroyCtx } = createContext(invitee, { params: { id: invite.id } });
        await controller.destroy(destroyCtx);

        const remaining = await GameInvite.find(invite.id);
        assert.isNull(remaining);
    });

    test("accept creates a ranked game", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const inviter = await createUser(`inviter-accept-${unique}`, `InviterAccept-${unique}`);
        const invitee = await createUser(`invitee-accept-${unique}`, `InviteeAccept-${unique}`);

        await createMutualFriendship(inviter.id, invitee.id);
        await createValidDeckForUser(inviter.id, `inviter-accept-${unique}`);
        await createValidDeckForUser(invitee.id, `invitee-accept-${unique}`);
        await touchPresence(inviter.id);
        await touchPresence(invitee.id);

        const controller = new GameInvitesController();
        const { ctx: storeCtx } = createContext(inviter, { body: { toUserId: invitee.id } });
        await controller.store(storeCtx);

        const invite = await GameInvite.query().where("fromUserId", inviter.id).firstOrFail();
        const { ctx: acceptCtx } = createContext(invitee, { params: { id: invite.id } });
        const acceptResponse = expectResult<{ gameId: number }>(await controller.accept(acceptCtx));

        const game = await Game.findOrFail(acceptResponse.gameId);
        assert.isFalse(game.isFinished);
        assert.notProperty(game.data, "isTraining");

        const remainingInvite = await GameInvite.find(invite.id);
        assert.isNull(remainingInvite);
    });

    test("rejects invite when invitee is offline", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const inviter = await createUser(`inviter-offline-${unique}`, `InviterOffline-${unique}`);
        const invitee = await createUser(`invitee-offline-${unique}`, `InviteeOffline-${unique}`);

        await createMutualFriendship(inviter.id, invitee.id);
        await createValidDeckForUser(inviter.id, `inviter-offline-${unique}`);

        const controller = new GameInvitesController();
        const { ctx, getBadRequestBody } = createContext(inviter, {
            body: { toUserId: invitee.id },
        });
        await controller.store(ctx);

        assert.deepEqual(getBadRequestBody(), { error: "Ce joueur n'est pas en ligne" });
    });

    test("rejects invite when users are not mutual friends", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const inviter = await createUser(`inviter-nofriend-${unique}`, `InviterNoFriend-${unique}`);
        const invitee = await createUser(`invitee-nofriend-${unique}`, `InviteeNoFriend-${unique}`);

        await createValidDeckForUser(inviter.id, `inviter-nofriend-${unique}`);
        await touchPresence(invitee.id);

        const controller = new GameInvitesController();
        const { ctx, getForbiddenBody } = createContext(inviter, {
            body: { toUserId: invitee.id },
        });
        await controller.store(ctx);

        assert.deepEqual(getForbiddenBody(), {
            error: "Vous devez être amis pour envoyer une invitation",
        });
    });

    test("allows only one outgoing invite per inviter", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const inviter = await createUser(`inviter-one-${unique}`, `InviterOne-${unique}`);
        const inviteeA = await createUser(`invitee-a-${unique}`, `InviteeA-${unique}`);
        const inviteeB = await createUser(`invitee-b-${unique}`, `InviteeB-${unique}`);

        await createMutualFriendship(inviter.id, inviteeA.id);
        await createMutualFriendship(inviter.id, inviteeB.id);
        await createValidDeckForUser(inviter.id, `inviter-one-${unique}`);
        await touchPresence(inviteeA.id);
        await touchPresence(inviteeB.id);

        const controller = new GameInvitesController();
        const { ctx: firstCtx } = createContext(inviter, { body: { toUserId: inviteeA.id } });
        await controller.store(firstCtx);

        const { ctx: secondCtx, getBadRequestBody } = createContext(inviter, {
            body: { toUserId: inviteeB.id },
        });
        await controller.store(secondCtx);

        assert.deepEqual(getBadRequestBody(), {
            error: "Vous avez déjà une invitation en attente",
        });
    });

    test("cancels received invites when invitee starts matchmaking", async ({ assert }) => {
        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const inviter = await createUser(`inviter-mm-${unique}`, `InviterMm-${unique}`);
        const invitee = await createUser(`invitee-mm-${unique}`, `InviteeMm-${unique}`);

        await createMutualFriendship(inviter.id, invitee.id);
        await createValidDeckForUser(inviter.id, `inviter-mm-${unique}`);
        await createValidDeckForUser(invitee.id, `invitee-mm-${unique}`);
        await touchPresence(invitee.id);

        const controller = new GameInvitesController();
        const { ctx: storeCtx } = createContext(inviter, { body: { toUserId: invitee.id } });
        await controller.store(storeCtx);

        const { ctx: searchCtx } = createContext(invitee);
        expectResult<GameSearchResponse>(await gameSearch(searchCtx));

        const remaining = await GameInvite.query().where("toUserId", invitee.id);
        assert.equal(remaining.length, 0);
    });

    test("cancels sent invite when inviter starts training", async ({ assert }) => {
        await syncCards();

        const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const inviter = await createUser(`inviter-train-${unique}`, `InviterTrain-${unique}`);
        const invitee = await createUser(`invitee-train-${unique}`, `InviteeTrain-${unique}`);

        inviter.onboardingCompletedAt = DateTime.now();
        await inviter.save();

        await createMutualFriendship(inviter.id, invitee.id);
        await createValidDeckForUser(inviter.id, `inviter-train-${unique}`);
        await touchPresence(invitee.id);

        const controller = new GameInvitesController();
        const { ctx: storeCtx } = createContext(inviter, { body: { toUserId: invitee.id } });
        await controller.store(storeCtx);

        const { ctx: trainingCtx } = createContext(inviter);
        await createTrainingGame(trainingCtx);

        const remaining = await GameInvite.query().where("fromUserId", inviter.id);
        assert.equal(remaining.length, 0);
    });
});
