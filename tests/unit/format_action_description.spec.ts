import { test } from "@japa/runner";
import {
    formatActionDescription,
    formatGroupedActionDescriptions,
    formatPlayCardPassiveTriggerLabel,
} from "#api_types/format_action_description";
import { getDisplayedDamage, getEffectiveDamage } from "#api_types/get_effective_damage";
import {
    createCardActionSnapshot,
    createCardFilterSnapshot,
    createComparisonSnapshot,
    createAllTargetSnapshot,
    createBoostSnapshot,
    createHeroTargetSnapshot,
    createMinionTargetSnapshot,
    createReconvertParametersSnapshot,
} from "#tests/helpers/game/fixtures";

test.group("get_effective_damage", () => {
    test("returns base damage when spell power is zero", ({ assert }) => {
        const action = createCardActionSnapshot({ type: "DAMAGE", damage: 3 });

        assert.equal(getEffectiveDamage(action, 0), 3);
        assert.equal(getDisplayedDamage(action, 0), 3);
    });

    test("adds spell power bonus to displayed damage", ({ assert }) => {
        const action = createCardActionSnapshot({ type: "DAMAGE", damage: 3 });

        assert.equal(getEffectiveDamage(action, 2), 5);
        assert.equal(getDisplayedDamage(action, 2), 5);
    });

    test("ignores spell power when not provided", ({ assert }) => {
        const action = createCardActionSnapshot({ type: "DAMAGE", damage: 3 });

        assert.equal(getDisplayedDamage(action), 3);
    });
});

test.group("format_action_description", () => {
    test("uses effective damage for spell descriptions", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 3,
        });

        assert.equal(
            formatActionDescription(action, "Effet", 2),
            "Effet : Inflige 5 dégâts au héros adverse.",
        );
    });

    test("keeps base damage when spell power is not provided", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 3,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 3 dégâts au héros adverse.",
        );
    });

    test("formats random limited minion damage", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 1,
            target: createMinionTargetSnapshot("OPPONENT", {
                maxTargets: 1,
                targetSelectionMode: "RANDOM",
            }),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 1 dégâts à un monstre adverse aléatoire.",
        );
    });

    test("formats random limited multi-target character damage as distinct targets", ({
        assert,
    }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 4,
            target: createAllTargetSnapshot("OPPONENT", {
                maxTargets: 3,
                targetSelectionMode: "RANDOM",
            }),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 4 dégâts à 3 personnages adverses aléatoires différents.",
        );
    });

    test("formats draw with explicit tag label", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DRAW",
            drawCount: 1,
            drawCardFilter: createCardFilterSnapshot({
                type: "MINION",
                tags: ["DEVELOPPEUR"],
            }),
        });

        assert.equal(
            formatActionDescription(action, "Cri de guerre"),
            "Cri de guerre : Pioche 1 carte Monstre + 💻 Développeur.",
        );
    });

    test("formats draw with OR filter alternatives", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DRAW",
            drawCount: 1,
            drawCardFilterAlternatives: [
                createCardFilterSnapshot({ type: "MINION", tags: ["DEVELOPPEUR"] }),
                createCardFilterSnapshot({ type: "ANY", tags: ["PETS"] }),
            ],
        });

        assert.equal(
            formatActionDescription(action, "Râle d'agonie"),
            "Râle d'agonie : Pioche 1 carte Monstre + 💻 Développeur OU Carte + 🐾 Pets.",
        );
    });

    test("formats targeted damage to any minion without redundant team label", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: true,
            damage: 6,
            target: createMinionTargetSnapshot("ALL"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 6 dégâts à un monstre.",
        );
    });

    test("formats targeted damage with explicit tag label", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: true,
            damage: 2,
            target: createMinionTargetSnapshot("OPPONENT", {
                tag: "DEVELOPPEUR",
            }),
        });

        assert.equal(
            formatActionDescription(action, "Cri de guerre"),
            "Cri de guerre : Inflige 2 dégâts à un monstre adverse 💻 Développeur.",
        );
    });

    test("contracts à les into aux for mass opponent minion damage", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 3,
            target: createMinionTargetSnapshot("OPPONENT"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 3 dégâts aux monstres adverses.",
        );
    });

    test("contracts à les into aux for mass opponent minion heal", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "HEAL",
            isTargeted: false,
            heal: 2,
            target: createMinionTargetSnapshot("OPPONENT"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Rend 2 PV aux monstres adverses.",
        );
    });

    test("formats PLAY_CARD passive trigger with card type filter", ({ assert }) => {
        assert.equal(formatPlayCardPassiveTriggerLabel(null), "carte jouée");
        assert.equal(
            formatPlayCardPassiveTriggerLabel(createCardFilterSnapshot({ type: "SPELL" })),
            "sort joué",
        );
        assert.equal(
            formatPlayCardPassiveTriggerLabel(createCardFilterSnapshot({ type: "MINION" })),
            "monstre joué",
        );
        assert.equal(
            formatPlayCardPassiveTriggerLabel(
                createCardFilterSnapshot({ type: "MINION", tags: ["PETS"] }),
            ),
            "monstre 🐾 Pets joué",
        );
    });

    test("formats onlySelf boost as lui-même", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "BOOST",
            isTargeted: false,
            boost: {
                attack: 1,
                health: 1,
                spellPower: null,
                extraBattlecryTriggers: null,
                minionPowers: null,
            },
            target: createMinionTargetSnapshot("PLAYER", { onlySelf: true }),
        });

        assert.equal(
            formatActionDescription(action, "Passif (fin de tour)"),
            "Passif (fin de tour) : Donne +1/+1 à lui-même.",
        );
    });

    test("formats onTargetResult survived with exact health clause", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: true,
            damage: 2,
            target: createMinionTargetSnapshot("ALL"),
            onTargetResult: {
                when: "SURVIVED",
                healthComparison: createComparisonSnapshot({
                    healthComparison: "=",
                    health: 1,
                }),
                action: createCardActionSnapshot({
                    type: "DRAW",
                    drawCount: 2,
                }),
            },
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 2 dégâts à un monstre. Si la cible survit avec 1 PV, pioche 2 cartes.",
        );
    });

    test("formats mass reconversion with direct object for opponent minions", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "RECONVERSION",
            isTargeted: false,
            target: createMinionTargetSnapshot("OPPONENT"),
            reconvertParameters: createReconvertParametersSnapshot({
                relativeToSource: true,
                comparison: createComparisonSnapshot({ costComparison: "=", cost: -1 }),
            }),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Reconvertit les monstres adverses en un monstre aléatoire coûtant 1 de moins que la cible.",
        );
    });

    test("formats targeted reconversion with relative cost", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "RECONVERSION",
            isTargeted: true,
            target: createMinionTargetSnapshot("PLAYER"),
            reconvertParameters: createReconvertParametersSnapshot({
                relativeToSource: true,
                comparison: createComparisonSnapshot({ costComparison: "=", cost: 1 }),
            }),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Reconvertit un monstre allié en un monstre aléatoire coûtant 1 de plus que la cible.",
        );
    });

    test("formats onTargetResult killed clause", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: true,
            damage: 1,
            target: createMinionTargetSnapshot("ALL"),
            onTargetResult: {
                when: "KILLED",
                healthComparison: null,
                action: createCardActionSnapshot({
                    type: "DRAW",
                    drawCount: 1,
                }),
            },
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 1 dégâts à un monstre. Si la cible est détruite, pioche 1 carte.",
        );
    });

    test("formats targeted destroy on enemy minion", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DESTROY",
            isTargeted: true,
            target: createMinionTargetSnapshot("OPPONENT"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Détruit un monstre adverse.",
        );
    });

    test("formats mass destroy on all enemy minions", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DESTROY",
            target: createMinionTargetSnapshot("OPPONENT"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Détruit aux monstres adverses.",
        );
    });

    test("formats BREAK_WEAPON on enemy hero", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "BREAK_WEAPON",
            target: createHeroTargetSnapshot("OPPONENT"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Détruit l'arme du héros adverse.",
        );
    });

    test("formats targeted BREAK_WEAPON on ally hero", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "BREAK_WEAPON",
            isTargeted: true,
            target: createHeroTargetSnapshot("PLAYER"),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Détruit l'arme du héros allié.",
        );
    });

    test("formats DECK_CARD ADD with random placement", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DECK_CARD",
            deckCardOperation: "ADD",
            deckPlacement: "RANDOM",
            deckTargetTeam: "PLAYER",
            cardId: 121,
            copyCount: 2,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Mélange 2 copies de Légume dans votre deck.",
        );
    });

    test("formats targeted DECK_CARD ADD from selected minion", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DECK_CARD",
            isTargeted: true,
            target: {
                type: "MINION",
                targetTeam: "ALL",
                comparison: null,
                tag: null,
                excludeSelf: false,
                onlySelf: false,
                maxTargets: null,
                targetSelectionMode: null,
                adjacency: null,
            },
            deckCardOperation: "ADD",
            deckPlacement: "RANDOM",
            deckTargetTeam: "PLAYER",
            cardId: null,
            copyCount: 3,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Choisissez un monstre sur le plateau. Placez 3 copies de celui-ci dans votre deck.",
        );
    });

    test("formats DECK_CARD ADD single copy on top of opponent deck", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DECK_CARD",
            deckCardOperation: "ADD",
            deckPlacement: "TOP",
            deckTargetTeam: "OPPONENT",
            cardId: 121,
            copyCount: 1,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Place 1 copie de Légume en haut du deck adverse.",
        );
    });

    test("formats DECK_CARD ADD random placement in opponent deck", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DECK_CARD",
            deckCardOperation: "ADD",
            deckPlacement: "RANDOM",
            deckTargetTeam: "OPPONENT",
            cardId: 121,
            copyCount: 2,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Mélange 2 copies de Légume dans le deck adverse.",
        );
    });

    test("formats DECK_CARD ADD bottom placement in every deck", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DECK_CARD",
            deckCardOperation: "ADD",
            deckPlacement: "BOTTOM",
            deckTargetTeam: "ALL",
            cardId: 121,
            copyCount: 2,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Place 2 copies de Légume en bas de chaque deck.",
        );
    });

    test("formats DECK_CARD DELETE single copy from player deck", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DECK_CARD",
            deckCardOperation: "DELETE",
            deckPlacement: "TOP",
            deckTargetTeam: "PLAYER",
            cardId: 121,
            copyCount: 1,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Retire 1 copie de la carte Légume de votre deck.",
        );
    });

    test("formats DECK_CARD DELETE from opponent deck", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DECK_CARD",
            deckCardOperation: "DELETE",
            deckPlacement: "TOP",
            deckTargetTeam: "OPPONENT",
            cardId: 121,
            copyCount: 2,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Retire 2 copies de la carte Légume du deck adverse.",
        );
    });

    test("formats DECK_CARD DELETE all copies from opponent deck", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DECK_CARD",
            deckCardOperation: "DELETE",
            deckPlacement: null,
            deckTargetTeam: "OPPONENT",
            cardId: 121,
            copyCount: null,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Supprime toutes les copies de la carte Légume du deck adverse.",
        );
    });

    test("formats DECK_CARD DELETE all copies from every deck", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DECK_CARD",
            deckCardOperation: "DELETE",
            deckPlacement: null,
            deckTargetTeam: "ALL",
            cardId: 121,
            copyCount: null,
        });

        assert.equal(
            formatActionDescription(action, "Cri de guerre"),
            "Cri de guerre : Supprime toutes les copies de la carte Légume de chaque deck.",
        );
    });

    test("formats HAND_CARD ADD to player hand", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "HAND_CARD",
            handTargetTeam: "PLAYER",
            cardId: 121,
            copyCount: 2,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Ajoute 2 copies de Légume à votre main.",
        );
    });

    test("formats RETURN_TO_HAND targeted ally minion", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "RETURN_TO_HAND",
            isTargeted: true,
            costReduction: 2,
            target: createMinionTargetSnapshot("PLAYER"),
        });

        assert.equal(
            formatActionDescription(action, "Git Revert"),
            "Git Revert : Renvoie un monstre allié dans votre main. Son coût est réduit de (2) cristaux.",
        );
    });

    test("formats RETURN_TO_HAND without cost reduction", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "RETURN_TO_HAND",
            isTargeted: true,
            costReduction: 0,
            target: createMinionTargetSnapshot("PLAYER"),
        });

        assert.equal(
            formatActionDescription(action, "Responsable du staffing"),
            "Responsable du staffing : Renvoie un monstre allié dans votre main.",
        );
    });

    test("formats RETURN_TO_HAND targeted enemy minion", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "RETURN_TO_HAND",
            isTargeted: true,
            costReduction: 0,
            target: createMinionTargetSnapshot("OPPONENT"),
        });

        assert.equal(
            formatActionDescription(action, "PR Refusée"),
            "PR Refusée : Renvoie un monstre adverse à la main adverse.",
        );
    });

    test("formats HAND_CARD ADD to opponent hand", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "HAND_CARD",
            handTargetTeam: "OPPONENT",
            cardId: 121,
            copyCount: 1,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Ajoute 1 copie de Légume à la main adverse.",
        );
    });

    test("formats HAND_CARD ADD to every hand", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "HAND_CARD",
            handTargetTeam: "ALL",
            cardId: 121,
            copyCount: 2,
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Ajoute 2 copies de Légume à chaque main.",
        );
    });

    test("merges consecutive HAND_CARD adds with the same target into one description", ({
        assert,
    }) => {
        const actions = [
            createCardActionSnapshot({
                type: "HAND_CARD",
                handTargetTeam: "PLAYER",
                cardId: 144,
                copyCount: 1,
            }),
            createCardActionSnapshot({
                type: "HAND_CARD",
                handTargetTeam: "PLAYER",
                cardId: 145,
                copyCount: 1,
            }),
            createCardActionSnapshot({
                type: "HAND_CARD",
                handTargetTeam: "PLAYER",
                cardId: 146,
                copyCount: 1,
            }),
        ];

        assert.deepEqual(formatGroupedActionDescriptions(actions, "Cri de guerre"), [
            "Cri de guerre : Ajoute 1 copie de mot blanc, 1 copie de mot rouge et 1 copie de mot bleu à votre main.",
        ]);
    });

    test("does not merge HAND_CARD adds with different targets", ({ assert }) => {
        const actions = [
            createCardActionSnapshot({
                type: "HAND_CARD",
                handTargetTeam: "PLAYER",
                cardId: 121,
                copyCount: 1,
            }),
            createCardActionSnapshot({
                type: "HAND_CARD",
                handTargetTeam: "OPPONENT",
                cardId: 121,
                copyCount: 1,
            }),
        ];

        assert.equal(formatGroupedActionDescriptions(actions, "Effet").length, 2);
    });

    test("merges consecutive identical DISCOVER actions", ({ assert }) => {
        const actions = [
            createCardActionSnapshot({
                type: "DISCOVER",
                discoverCardFilter: createCardFilterSnapshot({ type: "MINION", tags: ["PETS"] }),
                optionCount: 3,
            }),
            createCardActionSnapshot({
                type: "DISCOVER",
                discoverCardFilter: createCardFilterSnapshot({ type: "MINION", tags: ["PETS"] }),
                optionCount: 3,
            }),
        ];

        assert.deepEqual(formatGroupedActionDescriptions(actions, "Effet"), [
            "Effet : Découvrez un monstre 🐾 Pets. Puis, découvrez un autre monstre 🐾 Pets.",
        ]);
    });

    test("formats DISCOVER emoji spell filter", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DISCOVER",
            discoverCardFilter: createCardFilterSnapshot({
                type: "SPELL",
                labelTags: ["EMOJI"],
            }),
        });

        assert.equal(
            formatActionDescription(action, "Cri de guerre"),
            "Cri de guerre : Découvrez un sort Emoji.",
        );
    });

    test("formats DEFEAT opponent", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DEFEAT",
            targetTeam: "OPPONENT",
        });

        assert.equal(formatActionDescription(action, "Effet"), "Effet : Vous gagnez la partie.");
    });

    test("formats DEFEAT self", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DEFEAT",
            targetTeam: "PLAYER",
        });

        assert.equal(formatActionDescription(action, "Effet"), "Effet : Vous perdez la partie.");
    });

    test("formats DEFEAT both players", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DEFEAT",
            targetTeam: "ALL",
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Les deux joueurs perdent la partie.",
        );
    });

    test("formats adjacent ally boost battlecry", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "BOOST",
            isTargeted: false,
            boost: createBoostSnapshot({
                attack: 1,
                health: 1,
                minionPowers: {
                    hasTaunt: true,
                    hasCharge: false,
                    hasWindfury: false,
                    isPoisonous: false,
                    hasStealth: false,
                    hasDivineShield: false,
                },
            }),
            target: createMinionTargetSnapshot("PLAYER", {
                adjacency: "SOURCE",
                excludeSelf: true,
            }),
        });

        assert.equal(
            formatActionDescription(action, "Cri de guerre"),
            "Cri de guerre : Donne +1/+1, Provocation à vos serviteurs adjacents.",
        );
    });

    test("formats adjacent enemy splash damage", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "DAMAGE",
            isTargeted: false,
            damage: 2,
            target: createMinionTargetSnapshot("OPPONENT", {
                adjacency: "SELECTED_TARGET",
            }),
        });

        assert.equal(
            formatActionDescription(action, "Effet"),
            "Effet : Inflige 2 dégâts aux serviteurs adverses adjacents à la cible.",
        );
    });

    test("formats adjacent ally passive stealth aura", ({ assert }) => {
        const action = createCardActionSnapshot({
            type: "BOOST",
            isTargeted: false,
            boost: createBoostSnapshot({
                minionPowers: { hasStealth: true },
            }),
            target: createMinionTargetSnapshot("PLAYER", {
                adjacency: "SOURCE",
                excludeSelf: true,
            }),
        });

        assert.equal(
            formatActionDescription(action, "Passif"),
            "Passif : Donne Discrétion à vos serviteurs adjacents.",
        );
    });
});
