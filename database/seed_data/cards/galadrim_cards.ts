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
    healAction,
    minionDrawFilter,
    otherAllyMinions,
    otherAllyMinionsWithTag,
    randomEnemyTargets,
    spellDrawFilter,
    targetedAllyMinion,
    targetedAnyMinion,
    type CardSeedEntry,
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
        { ...gal("Stagiaire Dev", 1), attack: 1, health: 1 },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [drawAction(1, spellDrawFilter())],
        },
    ),
    defineMinion(
        { ...gal("Dev Front-End", 2), attack: 2, health: 3 },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [healAction(5, allyHero())],
        },
    ),
    defineMinion(
        { ...gal("Dev Back-End", 2), attack: 2, health: 3 },
        {
            tags: ["DEVELOPPEUR"],
            deathrattleActions: [drawAction(1, minionDrawFilter(["DEVELOPPEUR"]))],
        },
    ),
    defineMinion(
        { ...gal("Dev Aigri", 3), attack: 2, health: 3 },
        {
            tags: ["DEVELOPPEUR"],
            hasTaunt: true,
            battlecryActions: [damageAction(2, targetedAnyMinion(), true)],
        },
    ),
    defineMinion(
        { ...gal("QA Testeur Impitoyable", 3), attack: 1, health: 4 },
        { tags: ["DEVELOPPEUR"], isPoisonous: true },
    ),
    defineMinion(
        { ...gal("Dev Aguerri", 4), attack: 4, health: 5 },
        {
            tags: ["DEVELOPPEUR"],
            passives: [boostPassive(boostSpellPower(1), allyHero())],
        },
    ),
    defineMinion(
        { ...gal("Dev Insomniaque", 5), attack: 4, health: 5 },
        {
            tags: ["DEVELOPPEUR"],
            passives: [actionPassive("DRAW", damageAction(2, enemyHero()))],
        },
    ),
    defineMinion(
        { ...gal("Architecte Système", 7), attack: 6, health: 6 },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [damageAction(3, enemyMinions())],
        },
    ),

    // --- PM minions ---
    defineMinion(
        { ...gal("PM Junior", 1), attack: 1, health: 2 },
        {
            tags: ["PM"],
            battlecryActions: [boostAction(boostAttack(1), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        { ...gal("Scrum Master", 3), attack: 2, health: 4 },
        {
            tags: ["PM"],
            passives: [boostPassive(boostBoth(1, 1), otherAllyMinionsWithTag("DEVELOPPEUR"))],
        },
    ),
    defineMinion(
        { ...gal("PM Stressé", 3), attack: 3, health: 2 },
        {
            tags: ["PM"],
            battlecryActions: [boostAction(boostCharge(), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        { ...gal("Product Owner", 4), attack: 3, health: 4 },
        {
            tags: ["PM"],
            passives: [actionPassive("TURN_BEGIN", drawAction(1))],
        },
    ),
    defineMinion(
        { ...gal("Directeur de Projet", 5), attack: 4, health: 4 },
        {
            tags: ["PM"],
            battlecryActions: [boostAction(boostBothWithTaunt(2, 2), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        { ...gal("Agiliste Convaincu", 2), attack: 1, health: 4 },
        {
            tags: ["PM"],
            passives: [actionPassive("TURN_END", healAction(2, otherAllyMinions()))],
        },
    ),

    // --- sales / support minions ---
    defineMinion(
        { ...gal("BizDev Débutant", 1), attack: 1, health: 3 },
        {
            passives: [actionPassive("TURN_END", damageAction(1, enemyHero()))],
        },
    ),
    defineMinion(
        { ...gal("Sales Charismatique", 2), attack: 2, health: 3 },
        {
            battlecryActions: [drawAction(1), enemyDrawAction(1)],
        },
    ),
    defineMinion({ ...gal("Closer Affamé", 3), attack: 3, health: 2 }, { hasWindfury: true }),
    defineMinion(
        { ...gal("Négociateur", 4), attack: 4, health: 4 },
        {
            battlecryActions: [damageAction(4, enemyHero())],
        },
    ),
    defineMinion({ ...gal("Key Account Manager", 6), attack: 6, health: 5 }, { hasCharge: true }),
    defineMinion(
        { ...gal("Directeur Commercial", 6), attack: 5, health: 5 },
        {
            deathrattleActions: [damageAction(5, enemyHero())],
        },
    ),
    defineMinion({ ...gal("Agent Support", 1), attack: 1, health: 3 }, { hasTaunt: true }),
    defineMinion(
        { ...gal("Happiness Manager", 2), attack: 2, health: 3 },
        {
            battlecryActions: [healAction(4, allyHero())],
        },
    ),
    defineMinion(
        { ...gal("Recruteur RH", 3), attack: 2, health: 4 },
        {
            battlecryActions: [drawAction(1, minionDrawFilter([], costLessThan(4)))],
        },
    ),
    defineMinion(
        { ...gal("Manager Bienveillant", 4), attack: 3, health: 5 },
        {
            hasTaunt: true,
            deathrattleActions: [healAction(3, allyMinions())],
        },
    ),
    defineMinion({ ...gal("Support de Nuit", 5), attack: 4, health: 7 }, { hasTaunt: true }),

    // --- regional / pets minions ---
    defineMinion(
        { ...gal("Parisien Pressé", 2), attack: 3, health: 1 },
        { tags: ["PARISIEN"], hasCharge: true },
    ),
    defineMinion(
        { ...gal("Bobo Parisien", 3), attack: 2, health: 3 },
        {
            tags: ["PARISIEN"],
            battlecryActions: [drawAction(1, spellDrawFilter())],
        },
    ),
    defineMinion({ ...gal("Nantais Détendu", 3), attack: 3, health: 4 }, { tags: ["NANTAIS"] }),
    defineMinion(
        { ...gal("Nantais Créatif", 4), attack: 3, health: 3 },
        {
            tags: ["NANTAIS"],
            passives: [actionPassive("TURN_END", drawAction(1))],
        },
    ),
    defineMinion(
        { ...gal("Lyonnais Gourmand", 4), attack: 4, health: 5 },
        {
            tags: ["LYONNAIS"],
            deathrattleActions: [healAction(4, allyHero())],
        },
    ),
    defineMinion(
        { ...gal("Mascotte du Bureau", 1), attack: 1, health: 1 },
        {
            tags: ["PETS"],
            passives: [boostPassive(boostBoth(1, 1), otherAllyMinionsWithTag("PETS"))],
        },
    ),
    defineMinion(
        { ...gal("Chat sur le Clavier", 2), attack: 1, health: 2 },
        {
            tags: ["PETS"],
            hasTaunt: true,
            deathrattleActions: [drawAction(1)],
        },
    ),
    defineMinion(
        { ...gal("Chien Foufou", 3), attack: 3, health: 2 },
        { tags: ["PETS"], hasCharge: true },
    ),
    defineMinion({ ...gal("Plante Verte", 1), attack: 0, health: 4 }, { hasTaunt: true }),

    // --- spells ---
    defineSpell(gal("Pause Café", 2), boostAction(boostBoth(1, 1), allyMinions())),
    defineSpell(gal("Bug en Prod", 4), damageAction(3, allMinions())),
    defineSpell(gal("Déploiement Réussi", 3), drawAction(2)),
    defineSpell(gal("Réunion Interminable", 3), damageAction(3, enemyMinions())),
    defineSpell(
        gal("Sprint Review", 4),
        boostAction(boostBothWithTaunt(3, 3), targetedAllyMinion(), true),
    ),
    defineSpell(
        gal("Heures Sup'", 3),
        boostAction(boostAttackWithCharge(3), targetedAllyMinion(), true),
    ),
    defineSpell(gal("Burnout", 4), damageAction(6, targetedAnyMinion(), true)),
    defineSpell(gal("Team Building", 3), drawAction(2, minionDrawFilter())),
    defineSpell(gal("Goodies Galadrim", 1), healAction(5, targetedAllyMinion(), true)),
    defineSpell(gal("Coupure Internet", 6), damageAction(4, randomEnemyTargets(3))),

    // --- weapons ---
    defineWeapon({ ...gal("Tasse à Café Ébréchée", 1), damage: 1, durability: 4 }),
    defineWeapon(
        { ...gal("Clavier Mécanique", 2), damage: 2, durability: 2 },
        { deathrattleActions: [drawAction(1)] },
    ),
    defineWeapon(
        { ...gal("Câble Réseau", 4), damage: 4, durability: 2 },
        { deathrattleActions: [damageAction(2, enemyMinions())] },
    ),
];
