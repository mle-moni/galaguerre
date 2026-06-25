import { GALADRIM_CARD_SET_NAME } from "../card_set_names.js";
import { getGaladrimCardImage } from "../galadrim_card_images.js";
import {
    actionPassive,
    allyHero,
    allyMinions,
    allMinions,
    attackGreaterThan,
    boostAction,
    boostAttack,
    boostAttackWithCharge,
    boostAttackWithStealth,
    boostBoth,
    boostBothWithTaunt,
    boostCharge,
    boostPassive,
    boostSpellPower,
    costLessThan,
    damageAction,
    destroyAction,
    defineMinion,
    defineSpell,
    defineWeapon,
    drawAction,
    enemyDrawAction,
    enemyHero,
    enemyMinions,
    healthEquals,
    onTargetSurvivedWithHealth,
    healAction,
    minionDrawFilter,
    mindControlAction,
    manaTemporaryChangeAction,
    otherAllyMinions,
    otherAllyMinionsWithTag,
    randomEnemyCharacter,
    randomEnemyMinion,
    randomEnemyTargets,
    reconversionToCardId,
    reconversionAction,
    reconvertParameters,
    relativeCostReconversion,
    selfMinion,
    silenceAction,
    spellDrawFilter,
    targetedAllyMinion,
    targetedAnyMinion,
    targetedAnyMinionWithComparison,
    targetedEnemyMinion,
    type CardSeedEntry,
    boostDivineShield,
} from "./define_card.js";

const gal = (label: string, cost: number) => ({
    label,
    cost,
    imageUrl: getGaladrimCardImage(label),
    cardSetName: GALADRIM_CARD_SET_NAME,
});

export const GALADRIM_CARDS: CardSeedEntry[] = [
    // --- développeur minions ---
    defineMinion(
        62,
        {
            ...gal("Stagiaire Dev", 1),
            imageUrl: "/card-covers/galadrim/stagiaire-dev.webp",
            attack: 1,
            health: 1,
        },
        {
            tags: ["DEVELOPPEUR"],
            deathrattleActions: [drawAction(1, spellDrawFilter())],
        },
    ),
    defineMinion(
        113,
        {
            ...gal("Stagiaire Planqué", 1),
            imageUrl: "/card-covers/galadrim/stagiaire-planque.webp",
            attack: 2,
            health: 1,
        },
        {
            minionPowers: {
                hasStealth: true,
            },
        },
    ),
    defineMinion(
        63,
        {
            ...gal("Dev Front-End", 2),
            imageUrl: "/card-covers/galadrim/dev-front-end.webp",
            attack: 2,
            health: 3,
        },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [healAction(5, allyHero())],
        },
    ),
    defineMinion(
        64,
        {
            ...gal("Dev Back-End", 2),
            imageUrl: "/card-covers/galadrim/dev-back-end.webp",
            attack: 2,
            health: 3,
        },
        {
            tags: ["DEVELOPPEUR"],
            deathrattleActions: [drawAction(1, minionDrawFilter(["DEVELOPPEUR"]))],
        },
    ),
    defineMinion(
        65,
        {
            ...gal("Dev Aigri", 3),
            imageUrl: "/card-covers/galadrim/dev-aigri.webp",
            attack: 2,
            health: 3,
        },
        {
            tags: ["DEVELOPPEUR"],
            minionPowers: {
                hasTaunt: true,
            },
            battlecryActions: [damageAction(2, targetedAnyMinion(), true)],
        },
    ),
    defineMinion(
        66,
        {
            ...gal("QA Testeur Impitoyable", 3),
            imageUrl: "/card-covers/galadrim/qa-testeur-impitoyable.webp",
            attack: 1,
            health: 4,
        },
        {
            tags: ["DEVELOPPEUR"],
            minionPowers: {
                isPoisonous: true,
            },
        },
    ),
    defineMinion(
        67,
        {
            ...gal("Dev Aguerri", 4),
            imageUrl: "/card-covers/galadrim/dev-aguerri.webp",
            attack: 4,
            health: 4,
        },
        {
            tags: ["DEVELOPPEUR"],
            passives: [boostPassive(boostSpellPower(1), allyHero())],
        },
    ),
    defineMinion(
        68,
        {
            ...gal("Dev Insomniaque", 5),
            imageUrl: "/card-covers/galadrim/dev-insomniaque.webp",
            attack: 4,
            health: 5,
        },
        {
            tags: ["DEVELOPPEUR"],
            passives: [actionPassive("DRAW", damageAction(2, enemyHero()))],
        },
    ),
    defineMinion(
        69,
        {
            ...gal("Architecte Système", 7),
            imageUrl: "/card-covers/galadrim/architecte-systeme.webp",
            attack: 5,
            health: 5,
        },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [damageAction(5, targetedEnemyMinion(), true)],
        },
    ),

    // --- PM minions ---
    defineMinion(
        70,
        {
            ...gal("PM Junior", 1),
            imageUrl: "/card-covers/galadrim/pm-junior.webp",
            attack: 1,
            health: 2,
        },
        {
            tags: ["PM"],
            battlecryActions: [boostAction(boostAttack(1), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        71,
        {
            ...gal("Scrum Master", 3),
            imageUrl: "/card-covers/galadrim/scrum-master.webp",
            attack: 2,
            health: 4,
        },
        {
            tags: ["PM"],
            passives: [boostPassive(boostBoth(1, 1), otherAllyMinionsWithTag("DEVELOPPEUR"))],
        },
    ),
    defineMinion(
        72,
        {
            ...gal("PM Stressé", 3),
            imageUrl: "/card-covers/galadrim/pm-stresse.webp",
            attack: 3,
            health: 2,
        },
        {
            tags: ["PM"],
            battlecryActions: [boostAction(boostCharge(), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        73,
        {
            ...gal("Product Owner", 4),
            imageUrl: "/card-covers/galadrim/product-owner.webp",
            attack: 3,
            health: 4,
        },
        {
            tags: ["PM"],
            passives: [actionPassive("TURN_BEGIN", drawAction(1))],
        },
    ),
    defineMinion(
        74,
        {
            ...gal("Directeur de Projet", 5),
            imageUrl: "/card-covers/galadrim/directeur-de-projet.webp",
            attack: 4,
            health: 4,
        },
        {
            tags: ["PM"],
            battlecryActions: [boostAction(boostBothWithTaunt(2, 2), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        75,
        {
            ...gal("Agiliste Convaincu", 2),
            imageUrl: "/card-covers/galadrim/agiliste-convaincu.webp",
            attack: 1,
            health: 4,
        },
        {
            tags: ["PM"],
            passives: [actionPassive("TURN_END", healAction(2, otherAllyMinions()))],
        },
    ),

    // --- sales / support minions ---
    defineMinion(
        76,
        {
            ...gal("BizDev Débutant", 1),
            imageUrl: "/card-covers/galadrim/bizdev-debutant.webp",
            attack: 1,
            health: 2,
        },
        {
            tags: ["SALES"],
            passives: [actionPassive("TURN_END", damageAction(1, enemyHero()))],
        },
    ),
    defineMinion(
        77,
        {
            ...gal("Sales Charismatique", 2),
            imageUrl: "/card-covers/galadrim/sales-charismatique.webp",
            attack: 2,
            health: 2,
        },
        {
            tags: ["SALES"],
            battlecryActions: [drawAction(1), enemyDrawAction(1)],
        },
    ),
    defineMinion(
        78,
        {
            ...gal("Closer Affamé", 3),
            imageUrl: "/card-covers/galadrim/closer-affame.webp",
            attack: 3,
            health: 2,
        },
        {
            tags: ["SALES"],
            minionPowers: {
                hasWindfury: true,
            },
        },
    ),
    defineMinion(
        79,
        {
            ...gal("Négociateur", 4),
            imageUrl: "/card-covers/galadrim/negociateur.webp",
            attack: 4,
            health: 2,
        },
        {
            tags: ["SALES"],
            battlecryActions: [damageAction(3, enemyHero())],
        },
    ),
    defineMinion(
        80,
        {
            ...gal("Key Account Manager", 6),
            imageUrl: "/card-covers/galadrim/key-account-manager.webp",
            attack: 6,
            health: 2,
        },
        {
            tags: ["SALES"],
            minionPowers: {
                hasCharge: true,
            },
        },
    ),
    defineMinion(
        81,
        {
            ...gal("Directeur Commercial", 6),
            imageUrl: "/card-covers/galadrim/directeur-commercial.webp",
            attack: 5,
            health: 5,
        },
        {
            tags: ["SALES"],
            deathrattleActions: [damageAction(5, enemyHero())],
        },
    ),

    defineMinion(
        82,
        {
            ...gal("Agent Support", 1),
            imageUrl: "/card-covers/galadrim/agent-support.webp",
            attack: 1,
            health: 3,
        },
        {
            tags: ["SUPPORT"],
            minionPowers: {
                hasTaunt: true,
            },
        },
    ),
    defineMinion(
        83,
        {
            ...gal("Happiness Manager", 2),
            imageUrl: "/card-covers/galadrim/happiness-manager.webp",
            attack: 2,
            health: 3,
        },
        {
            tags: ["SUPPORT"],
            battlecryActions: [healAction(4, allyHero())],
        },
    ),
    defineMinion(
        84,
        {
            ...gal("Recruteur RH", 3),
            imageUrl: "/card-covers/galadrim/recruteur-rh.webp",
            attack: 2,
            health: 4,
        },
        {
            tags: ["SUPPORT"],
            battlecryActions: [drawAction(1, minionDrawFilter([], costLessThan(4)))],
        },
    ),
    defineMinion(
        130,
        {
            ...gal("Avocat d'Affaires", 5),
            imageUrl: "/card-covers/galadrim/avocat-d-affaires.webp",
            attack: 4,
            health: 5,
        },
        {
            tags: ["SUPPORT"],
            passives: [actionPassive("DAMAGE", damageAction(2, enemyHero()), null, allyHero())],
        },
    ),
    defineMinion(
        131,
        {
            ...gal("Membre du CSE", 3),
            imageUrl: "/card-covers/galadrim/membre-du-cse.webp",
            attack: 1,
            health: 3,
        },
        {
            tags: ["SUPPORT"],
            passives: [actionPassive("DAMAGE", drawAction(1), null, selfMinion())],
        },
    ),
    defineMinion(
        85,
        {
            ...gal("Manager Bienveillant", 4),
            imageUrl: "/card-covers/galadrim/manager-bienveillant.webp",
            attack: 3,
            health: 5,
        },
        {
            tags: ["SUPPORT"],
            minionPowers: {
                hasTaunt: true,
            },
            deathrattleActions: [healAction(3, allyMinions())],
        },
    ),
    defineMinion(
        86,
        {
            ...gal("Balin", 5),
            imageUrl: "/card-covers/galadrim/balin.webp",
            attack: 4,
            health: 6,
        },
        {
            tags: ["SUPPORT"],
            minionPowers: {
                hasTaunt: true,
            },
        },
    ),
    defineMinion(
        136,
        {
            ...gal("Fanny", 12),
            imageUrl: "/card-covers/galadrim/fanny.webp",
            attack: 8,
            health: 8,
        },
        {
            tags: ["SUPPORT"],
            dynamicCost: { reductions: [{ source: "BOARD_MINION_COUNT", amountPer: 1 }] },
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        138,
        {
            ...gal("Vincent", 12),
            imageUrl: "/card-covers/galadrim/vincent.webp",
            attack: 8,
            health: 8,
        },
        {
            tags: ["PM"],
            dynamicCost: { reductions: [{ source: "HAND_CARD_COUNT", amountPer: 1 }] },
        },
        { rarity: "LEGENDARY" },
    ),

    // --- regional / pets minions ---
    defineMinion(
        87,
        {
            ...gal("Parisien Pressé", 2),
            imageUrl: "/card-covers/galadrim/parisien-presse.webp",
            attack: 2,
            health: 1,
        },
        {
            tags: ["PARISIEN"],
            minionPowers: {
                hasCharge: true,
            },
        },
    ),
    defineMinion(
        88,
        {
            ...gal("Bobo Parisien", 3),
            imageUrl: "/card-covers/galadrim/bobo-parisien.webp",
            attack: 2,
            health: 3,
        },
        {
            tags: ["PARISIEN"],
            battlecryActions: [drawAction(1, spellDrawFilter())],
        },
    ),
    defineMinion(
        89,
        {
            ...gal("Nantais Détendu", 3),
            imageUrl: "/card-covers/galadrim/nantais-detendu.webp",
            attack: 3,
            health: 4,
        },
        { tags: ["NANTAIS"] },
    ),
    defineMinion(
        90,
        {
            ...gal("Nantais Créatif", 4),
            imageUrl: "/card-covers/galadrim/nantais-creatif.webp",
            attack: 3,
            health: 3,
        },
        {
            tags: ["NANTAIS"],
            passives: [actionPassive("TURN_END", drawAction(1))],
        },
    ),
    defineMinion(
        91,
        {
            ...gal("Lyonnais Gourmand", 4),
            imageUrl: "/card-covers/galadrim/lyonnais-gourmand.webp",
            attack: 3,
            health: 5,
        },
        {
            tags: ["LYONNAIS"],
            deathrattleActions: [healAction(4, allyHero())],
        },
    ),
    defineMinion(
        92,
        {
            ...gal("Mascotte du Bureau", 1),
            imageUrl: "/card-covers/galadrim/mascotte-du-bureau.webp",
            attack: 1,
            health: 1,
        },
        {
            tags: ["PETS"],
            passives: [boostPassive(boostBoth(1, 1), otherAllyMinionsWithTag("PETS"))],
        },
    ),
    defineMinion(
        93,
        {
            ...gal("Chat sur le Clavier", 2),
            imageUrl: "/card-covers/galadrim/chat-sur-le-clavier.webp",
            attack: 1,
            health: 2,
        },
        {
            tags: ["PETS"],
            minionPowers: {
                hasTaunt: true,
            },
            deathrattleActions: [drawAction(1)],
        },
    ),
    defineMinion(
        94,
        {
            ...gal("Chien Foufou", 3),
            imageUrl: "/card-covers/galadrim/chien-foufou.webp",
            attack: 3,
            health: 1,
        },
        {
            tags: ["PETS"],
            minionPowers: {
                hasCharge: true,
            },
        },
    ),
    defineMinion(
        95,
        {
            ...gal("Plante Verte", 1),
            imageUrl: "/card-covers/galadrim/plante-verte.webp",
            attack: 0,
            health: 4,
        },
        {
            minionPowers: {
                hasTaunt: true,
            },
        },
    ),
    defineMinion(
        111,
        {
            ...gal("PM en télétravail", 3),
            imageUrl: "/card-covers/galadrim/pm-en-teletravail.webp",
            attack: 3,
            health: 1,
        },
        {
            tags: ["PM"],
            minionPowers: {
                hasDivineShield: true,
            },
        },
    ),
    defineMinion(
        114,
        {
            ...gal("Télétravailleur Injoignable", 3),
            imageUrl: "/card-covers/galadrim/teletravailleur-injoignable.webp",
            attack: 1,
            health: 1,
        },
        {
            minionPowers: {
                hasStealth: true,
            },
            passives: [actionPassive("TURN_END", boostAction(boostBoth(1, 1), selfMinion()))],
        },
    ),

    // --- play-card trigger minions ---
    defineMinion(
        115,
        {
            ...gal("Commère de l'Open Space", 2),
            imageUrl: "/card-covers/galadrim/commere-de-l-open-space.webp",
            attack: 3,
            health: 2,
        },
        {
            passives: [
                actionPassive(
                    "SUMMON",
                    damageAction(1, randomEnemyCharacter()),
                    null,
                    null,
                    minionDrawFilter(),
                ),
            ],
        },
    ),
    defineMinion(
        116,
        {
            ...gal("Office Manager Dévoué", 3),
            imageUrl: "/card-covers/galadrim/office-manager-devoue.webp",
            attack: 3,
            health: 3,
        },
        {
            tags: ["SUPPORT"],
            passives: [
                actionPassive("SUMMON", healAction(2, allyHero()), null, null, minionDrawFilter()),
            ],
        },
    ),
    defineMinion(
        117,
        {
            ...gal("Alternant Surmotivé", 1),
            imageUrl: "/card-covers/galadrim/alternant-surmotive.webp",
            attack: 1,
            health: 2,
        },
        {
            passives: [
                actionPassive(
                    "PLAY_CARD",
                    boostAction(boostAttack(1), selfMinion()),
                    spellDrawFilter(),
                ),
            ],
        },
    ),
    defineMinion(
        118,
        {
            ...gal("Distributeur de Croquettes", 3),
            imageUrl: "/card-covers/galadrim/distributeur-de-croquettes-yomy.webp",
            attack: 0,
            health: 4,
        },
        {
            passives: [
                actionPassive("SUMMON", drawAction(1), null, null, minionDrawFilter(["PETS"])),
            ],
        },
    ),
    defineMinion(
        119,
        {
            ...gal("DevOps en Sueur", 2),
            imageUrl: "/card-covers/galadrim/devops-en-sueur.webp",
            attack: 3,
            health: 2,
        },
        {
            passives: [
                actionPassive("PLAY_CARD", damageAction(1, allMinions()), spellDrawFilter()),
            ],
        },
    ),
    defineMinion(
        137,
        {
            ...gal("Léo Pompier", 20),
            imageUrl: "/card-covers/galadrim/leo-pompier.webp",
            attack: 8,
            health: 8,
        },
        {
            tags: ["DEVELOPPEUR"],
            dynamicCost: { reductions: [{ source: "HERO_MISSING_HEALTH", amountPer: 1 }] },
        },
        { rarity: "LEGENDARY" },
    ),

    // --- spells ---
    defineSpell(
        96,
        {
            ...gal("Pause Café", 2),
            imageUrl: "/card-covers/galadrim/pause-cafe.webp",
        },
        [boostAction(boostBoth(1, 1), allyMinions())],
    ),
    defineSpell(
        97,
        {
            ...gal("Bug en Prod", 4),
            imageUrl: "/card-covers/galadrim/bug-en-prod.webp",
        },
        [damageAction(3, allMinions())],
    ),
    defineSpell(
        98,
        {
            ...gal("Déploiement Réussi", 3),
            imageUrl: "/card-covers/galadrim/deploiement-reussi.webp",
        },
        [drawAction(2)],
    ),
    defineSpell(
        99,
        {
            ...gal("Réunion Interminable", 5),
            imageUrl: "/card-covers/galadrim/reunion-interminable.webp",
        },
        [damageAction(3, enemyMinions())],
    ),
    defineSpell(
        100,
        {
            ...gal("Sprint Review", 4),
            imageUrl: "/card-covers/galadrim/sprint-review.webp",
        },
        [boostAction(boostBothWithTaunt(3, 3), targetedAllyMinion(), true)],
    ),
    defineSpell(
        101,
        {
            ...gal("Heures Sup'", 3),
            imageUrl: "/card-covers/galadrim/heures-sup.webp",
        },
        [boostAction(boostAttackWithCharge(2), targetedAllyMinion(), true)],
    ),
    defineSpell(
        102,
        {
            ...gal("Burnout", 3),
            imageUrl: "/card-covers/galadrim/burnout.webp",
        },
        [destroyAction(targetedAnyMinionWithComparison(attackGreaterThan(4)), true)],
    ),
    defineSpell(
        132,
        {
            ...gal("Fin de Période d'Essai", 2),
            imageUrl: "/card-covers/galadrim/fin-de-periode-d-essai.webp",
        },
        [destroyAction(targetedAnyMinionWithComparison(costLessThan(4)), true)],
    ),
    defineSpell(
        133,
        {
            ...gal("Licenciement pour Faute", 5),
            imageUrl: "/card-covers/galadrim/licenciement-pour-faute.webp",
        },
        [destroyAction(targetedAnyMinion(), true)],
    ),
    defineSpell(
        134,
        {
            ...gal("Licenciement collectif", 8),
            imageUrl: "/card-covers/galadrim/licenciement-collectif.webp",
        },
        [destroyAction(allMinions())],
    ),
    defineSpell(
        135,
        {
            ...gal("Optimisation Salariale", 1),
            imageUrl: "/card-covers/galadrim/optimisation-salariale.webp",
        },
        [destroyAction(targetedAllyMinion(), true), drawAction(2)],
    ),
    defineSpell(
        103,
        {
            ...gal("Team Building", 3),
            imageUrl: "/card-covers/galadrim/team-building.webp",
        },
        [drawAction(2, minionDrawFilter())],
    ),
    defineSpell(
        104,
        {
            ...gal("Goodies Galadrim", 1),
            imageUrl: "/card-covers/galadrim/goodies-galadrim.webp",
        },
        [healAction(5, targetedAllyMinion(), true)],
    ),
    defineSpell(
        105,
        {
            ...gal("Coupure Internet", 6),
            imageUrl: "/card-covers/galadrim/coupure-internet.webp",
        },
        [damageAction(4, randomEnemyTargets(3))],
    ),
    defineSpell(
        109,
        {
            ...gal("Lendemain de soirée", 1),
            imageUrl: "/card-covers/galadrim/lendemain-de-soiree.webp",
        },
        [silenceAction(targetedAnyMinion(), true), damageAction(1, targetedAnyMinion(), true)],
    ),
    defineSpell(
        110,
        {
            ...gal("Casque à Réduction de Bruit", 1),
            imageUrl: "/card-covers/galadrim/casque-reduction-bruit.webp",
        },
        [boostAction(boostDivineShield(), targetedAllyMinion(), true)],
    ),
    defineSpell(
        112,
        {
            ...gal("Navigation Privée", 1),
            imageUrl: "/card-covers/galadrim/navigation-privee.webp",
        },
        [boostAction(boostAttackWithStealth(1), targetedAnyMinion(), true)],
    ),
    defineSpell(
        120,
        { ...gal("Jet de Ducros", 2), imageUrl: "/card-covers/galadrim/jet-de-ducros.webp" },
        [
            damageAction(2, targetedAnyMinion(), true, {
                onTargetResult: onTargetSurvivedWithHealth(healthEquals(1), drawAction(2)),
            }),
        ],
    ),
    defineSpell(
        122,
        { ...gal("Doom scrolling", 4), imageUrl: "/card-covers/galadrim/doom-scrolling.webp" },
        [reconversionToCardId(121, targetedAnyMinion(), true)],
    ),
    defineSpell(
        123,
        { ...gal("Levée de Fonds", 1), imageUrl: "/card-covers/galadrim/levee-de-fonds.webp" },
        [relativeCostReconversion(1, targetedAllyMinion(), true)],
    ),
    defineSpell(
        124,
        {
            ...gal("Coupe Budgétaire", 2),
            imageUrl: "/card-covers/galadrim/coupe-budgetaire.webp",
        },
        [relativeCostReconversion(-1, enemyMinions())],
    ),
    defineSpell(
        126,
        { ...gal("Congrès Tech", 5), imageUrl: "/card-covers/galadrim/congres-tech.webp" },
        [
            reconversionAction(
                reconvertParameters({
                    tags: ["DEVELOPPEUR"],
                    comparison: costLessThan(4),
                }),
                allMinions(),
            ),
        ],
    ),
    defineSpell(
        127,
        {
            ...gal("Contrat Freelance", 3),
            imageUrl: "/card-covers/galadrim/contrat-freelance.webp",
        },
        [reconversionToCardId(125, targetedAnyMinion(), true)],
    ),
    defineSpell(
        128,
        { ...gal("Débauchage", 9), imageUrl: "/card-covers/galadrim/debauchage.webp" },
        [mindControlAction(targetedEnemyMinion(), true)],
    ),
    defineMinion(
        129,
        {
            ...gal("Chasseur de Têtes", 3),
            imageUrl: "/card-covers/galadrim/chasseur-de-tetes.webp",
            attack: 3,
            health: 3,
        },
        {
            tags: ["SUPPORT"],
            battlecryActions: [
                mindControlAction(randomEnemyMinion(), false, {
                    condition: { opponentMinionCountMin: 4 },
                }),
            ],
        },
    ),

    // --- weapons ---
    defineWeapon(106, {
        ...gal("Tasse à Café Ébréchée", 1),
        imageUrl: "/card-covers/galadrim/tasse-a-cafe-ebrechee.webp",
        damage: 1,
        durability: 4,
    }),
    defineWeapon(
        107,
        {
            ...gal("Clavier Mécanique", 2),
            imageUrl: "/card-covers/galadrim/clavier-mecanique.webp",
            damage: 2,
            durability: 2,
        },
        { deathrattleActions: [drawAction(1)] },
    ),
    defineWeapon(
        108,
        {
            ...gal("Câble Réseau", 6),
            imageUrl: "/card-covers/galadrim/cable-reseau.webp",
            damage: 4,
            durability: 2,
        },
        { deathrattleActions: [damageAction(2, enemyMinions())] },
    ),

    // --- cartes non collectionnables ---
    defineSpell(
        1,
        {
            label: "Ticket Restaurant",
            cost: 0,
            imageUrl: "/card-covers/ticket-restaurant.webp",
            cardSetName: GALADRIM_CARD_SET_NAME,
        },
        [manaTemporaryChangeAction(1)],
        [],
        { isCollectible: false },
    ),
    defineMinion(
        121,
        {
            ...gal("Légume", 1),
            imageUrl: "/card-covers/galadrim/legume.webp",
            attack: 1,
            health: 1,
        },
        {},
        { isCollectible: false },
    ),
    defineMinion(
        125,
        {
            ...gal("Freelance", 3),
            imageUrl: "/card-covers/galadrim/freelance.webp",
            attack: 3,
            health: 3,
        },
        {},
        { isCollectible: false },
    ),
];
