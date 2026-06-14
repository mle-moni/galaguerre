import { GALADRIM_CARD_SET_NAME } from "../card_set_names.js";
import { getGaladrimCardImage } from "../galadrim_card_images.js";
import {
    actionPassive,
    allyHero,
    allyMinions,
    allMinions,
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
        { ...gal("Stagiaire Dev", 1), attack: 1, health: 1 },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [drawAction(1, spellDrawFilter())],
        },
    ),
    defineMinion(
        113,
        { ...gal("Stagiaire Planqué", 1), attack: 2, health: 1 },
        {
            minionPowers: {
                hasStealth: true,
            },
        },
    ),
    defineMinion(
        63,
        { ...gal("Dev Front-End", 2), attack: 2, health: 3 },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [healAction(5, allyHero())],
        },
    ),
    defineMinion(
        64,
        { ...gal("Dev Back-End", 2), attack: 2, health: 3 },
        {
            tags: ["DEVELOPPEUR"],
            deathrattleActions: [drawAction(1, minionDrawFilter(["DEVELOPPEUR"]))],
        },
    ),
    defineMinion(
        65,
        { ...gal("Dev Aigri", 3), attack: 2, health: 3 },
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
        { ...gal("QA Testeur Impitoyable", 3), attack: 1, health: 4 },
        {
            tags: ["DEVELOPPEUR"],
            minionPowers: {
                isPoisonous: true,
            },
        },
    ),
    defineMinion(
        67,
        { ...gal("Dev Aguerri", 4), attack: 4, health: 5 },
        {
            tags: ["DEVELOPPEUR"],
            passives: [boostPassive(boostSpellPower(1), allyHero())],
        },
    ),
    defineMinion(
        68,
        { ...gal("Dev Insomniaque", 5), attack: 4, health: 5 },
        {
            tags: ["DEVELOPPEUR"],
            passives: [actionPassive("DRAW", damageAction(2, enemyHero()))],
        },
    ),
    defineMinion(
        69,
        { ...gal("Architecte Système", 7), attack: 6, health: 6 },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [damageAction(3, enemyMinions())],
        },
    ),

    // --- PM minions ---
    defineMinion(
        70,
        { ...gal("PM Junior", 1), attack: 1, health: 2 },
        {
            tags: ["PM"],
            battlecryActions: [boostAction(boostAttack(1), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        71,
        { ...gal("Scrum Master", 3), attack: 2, health: 4 },
        {
            tags: ["PM"],
            passives: [boostPassive(boostBoth(1, 1), otherAllyMinionsWithTag("DEVELOPPEUR"))],
        },
    ),
    defineMinion(
        72,
        { ...gal("PM Stressé", 3), attack: 3, health: 2 },
        {
            tags: ["PM"],
            battlecryActions: [boostAction(boostCharge(), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        73,
        { ...gal("Product Owner", 4), attack: 3, health: 4 },
        {
            tags: ["PM"],
            passives: [actionPassive("TURN_BEGIN", drawAction(1))],
        },
    ),
    defineMinion(
        74,
        { ...gal("Directeur de Projet", 5), attack: 4, health: 4 },
        {
            tags: ["PM"],
            battlecryActions: [boostAction(boostBothWithTaunt(2, 2), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        75,
        { ...gal("Agiliste Convaincu", 2), attack: 1, health: 4 },
        {
            tags: ["PM"],
            passives: [actionPassive("TURN_END", healAction(2, otherAllyMinions()))],
        },
    ),

    // --- sales / support minions ---
    defineMinion(
        76,
        { ...gal("BizDev Débutant", 1), attack: 1, health: 3 },
        {
            tags: ["SALES"],
            passives: [actionPassive("TURN_END", damageAction(1, enemyHero()))],
        },
    ),
    defineMinion(
        77,
        { ...gal("Sales Charismatique", 2), attack: 2, health: 3 },
        {
            tags: ["SALES"],
            battlecryActions: [drawAction(1), enemyDrawAction(1)],
        },
    ),
    defineMinion(
        78,
        { ...gal("Closer Affamé", 3), attack: 3, health: 2 },
        {
            tags: ["SALES"],
            minionPowers: {
                hasWindfury: true,
            },
        },
    ),
    defineMinion(
        79,
        { ...gal("Négociateur", 4), attack: 4, health: 4 },
        {
            tags: ["SALES"],
            battlecryActions: [damageAction(4, enemyHero())],
        },
    ),
    defineMinion(
        80,
        { ...gal("Key Account Manager", 6), attack: 6, health: 5 },
        {
            tags: ["SALES"],
            minionPowers: {
                hasCharge: true,
            },
        },
    ),
    defineMinion(
        81,
        { ...gal("Directeur Commercial", 6), attack: 5, health: 5 },
        {
            tags: ["SALES"],
            deathrattleActions: [damageAction(5, enemyHero())],
        },
    ),
    defineMinion(
        82,
        { ...gal("Agent Support", 1), attack: 1, health: 3 },
        {
            tags: ["SUPPORT"],
            minionPowers: {
                hasTaunt: true,
            },
        },
    ),
    defineMinion(
        83,
        { ...gal("Happiness Manager", 2), attack: 2, health: 3 },
        {
            tags: ["SUPPORT"],
            battlecryActions: [healAction(4, allyHero())],
        },
    ),
    defineMinion(
        84,
        { ...gal("Recruteur RH", 3), attack: 2, health: 4 },
        {
            tags: ["SUPPORT"],
            battlecryActions: [drawAction(1, minionDrawFilter([], costLessThan(4)))],
        },
    ),
    defineMinion(
        85,
        { ...gal("Manager Bienveillant", 4), attack: 3, health: 5 },
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
        { ...gal("Balin", 5), attack: 4, health: 7 },
        {
            tags: ["SUPPORT"],
            minionPowers: {
                hasTaunt: true,
            },
        },
    ),

    // --- regional / pets minions ---
    defineMinion(
        87,
        { ...gal("Parisien Pressé", 2), attack: 3, health: 1 },
        {
            tags: ["PARISIEN"],
            minionPowers: {
                hasCharge: true,
            },
        },
    ),
    defineMinion(
        88,
        { ...gal("Bobo Parisien", 3), attack: 2, health: 3 },
        {
            tags: ["PARISIEN"],
            battlecryActions: [drawAction(1, spellDrawFilter())],
        },
    ),
    defineMinion(89, { ...gal("Nantais Détendu", 3), attack: 3, health: 4 }, { tags: ["NANTAIS"] }),
    defineMinion(
        90,
        { ...gal("Nantais Créatif", 4), attack: 3, health: 3 },
        {
            tags: ["NANTAIS"],
            passives: [actionPassive("TURN_END", drawAction(1))],
        },
    ),
    defineMinion(
        91,
        { ...gal("Lyonnais Gourmand", 4), attack: 4, health: 5 },
        {
            tags: ["LYONNAIS"],
            deathrattleActions: [healAction(4, allyHero())],
        },
    ),
    defineMinion(
        92,
        { ...gal("Mascotte du Bureau", 1), attack: 1, health: 1 },
        {
            tags: ["PETS"],
            passives: [boostPassive(boostBoth(1, 1), otherAllyMinionsWithTag("PETS"))],
        },
    ),
    defineMinion(
        93,
        { ...gal("Chat sur le Clavier", 2), attack: 1, health: 2 },
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
        { ...gal("Chien Foufou", 3), attack: 3, health: 2 },
        {
            tags: ["PETS"],
            minionPowers: {
                hasCharge: true,
            },
        },
    ),
    defineMinion(
        95,
        { ...gal("Plante Verte", 1), attack: 0, health: 4 },
        {
            minionPowers: {
                hasTaunt: true,
            },
        },
    ),
    defineMinion(
        111,
        { ...gal("PM en télétravail", 3), attack: 3, health: 1 },
        {
            tags: ["PM"],
            minionPowers: {
                hasDivineShield: true,
            },
        },
    ),
    defineMinion(
        114,
        { ...gal("Télétravailleur Injoignable", 3), attack: 1, health: 1 },
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
        { ...gal("Commère de l'Open Space", 2), attack: 3, health: 2 },
        {
            passives: [
                actionPassive(
                    "PLAY_CARD",
                    damageAction(1, randomEnemyCharacter()),
                    minionDrawFilter(),
                ),
            ],
        },
    ),
    defineMinion(
        116,
        { ...gal("Office Manager Dévoué", 3), attack: 3, health: 3 },
        {
            tags: ["SUPPORT"],
            passives: [actionPassive("PLAY_CARD", healAction(2, allyHero()), minionDrawFilter())],
        },
    ),
    defineMinion(
        117,
        { ...gal("Alternant Surmotivé", 1), attack: 1, health: 2 },
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
        { ...gal("Distributeur de Croquettes", 3), attack: 0, health: 4 },
        {
            passives: [actionPassive("PLAY_CARD", drawAction(1), minionDrawFilter(["PETS"]))],
        },
    ),
    defineMinion(
        119,
        { ...gal("DevOps en Sueur", 2), attack: 3, health: 2 },
        {
            passives: [
                actionPassive("PLAY_CARD", damageAction(1, allMinions()), spellDrawFilter()),
            ],
        },
    ),

    // --- spells ---
    defineSpell(96, gal("Pause Café", 2), [boostAction(boostBoth(1, 1), allyMinions())]),
    defineSpell(97, gal("Bug en Prod", 4), [damageAction(3, allMinions())]),
    defineSpell(98, gal("Déploiement Réussi", 3), [drawAction(2)]),
    defineSpell(99, gal("Réunion Interminable", 3), [damageAction(3, enemyMinions())]),
    defineSpell(100, gal("Sprint Review", 4), [
        boostAction(boostBothWithTaunt(3, 3), targetedAllyMinion(), true),
    ]),
    defineSpell(101, gal("Heures Sup'", 3), [
        boostAction(boostAttackWithCharge(3), targetedAllyMinion(), true),
    ]),
    defineSpell(102, gal("Burnout", 4), [damageAction(6, targetedAnyMinion(), true)]),
    defineSpell(103, gal("Team Building", 3), [drawAction(2, minionDrawFilter())]),
    defineSpell(104, gal("Goodies Galadrim", 1), [healAction(5, targetedAllyMinion(), true)]),
    defineSpell(105, gal("Coupure Internet", 6), [damageAction(4, randomEnemyTargets(3))]),
    defineSpell(109, gal("Lendemain de soirée", 1), [
        silenceAction(targetedAnyMinion(), true),
        damageAction(1, targetedAnyMinion(), true),
    ]),
    defineSpell(110, gal("Casque à Réduction de Bruit", 1), [
        boostAction(boostDivineShield(), targetedAllyMinion(), true),
    ]),
    defineSpell(112, gal("Navigation Privée", 1), [
        boostAction(boostAttackWithStealth(1), targetedAnyMinion(), true),
    ]),
    defineSpell(120, gal("Jet de Ducros", 2), [
        damageAction(2, targetedAnyMinion(), true, {
            onTargetResult: onTargetSurvivedWithHealth(healthEquals(1), drawAction(2)),
        }),
    ]),
    defineSpell(122, gal("Doom scrolling", 4), [
        reconversionToCardId(121, targetedAnyMinion(), true),
    ]),
    defineSpell(123, gal("Levée de Fonds", 1), [
        relativeCostReconversion(1, targetedAllyMinion(), true),
    ]),
    defineSpell(124, gal("Coupe Budgétaire", 2), [relativeCostReconversion(-1, enemyMinions())]),
    defineSpell(126, gal("Congrès Tech", 5), [
        reconversionAction(
            reconvertParameters({
                tags: ["DEVELOPPEUR"],
                comparison: costLessThan(4),
            }),
            allMinions(),
        ),
    ]),
    defineSpell(127, gal("Contrat Freelance", 3), [
        reconversionToCardId(125, targetedAnyMinion(), true),
    ]),
    defineSpell(128, gal("Débauchage", 8), [mindControlAction(targetedEnemyMinion(), true)]),
    defineMinion(
        129,
        { ...gal("Chasseur de Têtes", 3), attack: 3, health: 3 },
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
    defineWeapon(106, { ...gal("Tasse à Café Ébréchée", 1), damage: 1, durability: 4 }),
    defineWeapon(
        107,
        { ...gal("Clavier Mécanique", 2), damage: 2, durability: 2 },
        { deathrattleActions: [drawAction(1)] },
    ),
    defineWeapon(
        108,
        { ...gal("Câble Réseau", 4), damage: 4, durability: 2 },
        { deathrattleActions: [damageAction(2, enemyMinions())] },
    ),

    // --- cartes non collectionnables ---
    defineMinion(121, { ...gal("Légume", 1), attack: 1, health: 1 }, {}, { isCollectible: false }),
    defineMinion(
        125,
        { ...gal("Freelance", 3), attack: 3, health: 3 },
        {},
        { isCollectible: false },
    ),
];
