import { HEARTHSTONE_CARD_SET_NAME } from "../card_set_names.js";
import { getClassicCardImage } from "../classic_card_images.js";
import {
    actionPassive,
    allyHero,
    allyMinions,
    allCharacters,
    allEnemies,
    attackGreaterThan,
    boostAction,
    boostAttack,
    boostBoth,
    boostHealth,
    boostPassive,
    boostSpellPower,
    boostTaunt,
    costEquals,
    damageAction,
    defineMinion,
    defineSpell,
    defineWeapon,
    drawAction,
    enemyDrawAction,
    enemyHero,
    healAction,
    healthLessThan,
    minionDrawFilter,
    otherAllyMinionsWithTag,
    otherCharacters,
    randomEnemyCharacter,
    randomEnemyMinion,
    randomEnemyTargets,
    targetedAllyMinion,
    targetedAnyCharacter,
    targetedEnemyHero,
    targetedEnemyMinion,
    targetedEnemyMinionWithComparison,
    targetedEnemyMinionWithTag,
    type CardSeedEntry,
} from "./define_card.js";

const hs = (label: string, cost: number) => ({
    label,
    cost,
    imageUrl: getClassicCardImage(label),
    cardSetName: HEARTHSTONE_CARD_SET_NAME,
});

export const CLASSIC_CARDS: CardSeedEntry[] = [
    // --- 01_card_seeder: base minions ---
    defineMinion({ ...hs("Lutin", 0), attack: 1, health: 1 }),
    defineMinion({ ...hs("Éclaireur pandaren", 1), attack: 1, health: 1 }),
    defineMinion({ ...hs("Sanglier", 1), attack: 1, health: 1 }, { tags: ["BEAST"] }),
    defineMinion({ ...hs("Porte-bouclier", 1), attack: 0, health: 4 }, { hasTaunt: true }),
    defineMinion(
        { ...hs("Jeune faucon-dragon", 1), attack: 1, health: 1 },
        { tags: ["BEAST"], hasWindfury: true },
    ),
    defineMinion({ ...hs("Dragon mécanique", 1), attack: 2, health: 1 }, { tags: ["MECH"] }),
    defineMinion({ ...hs("Moine du Shado-Pan", 2), attack: 2, health: 2 }),
    defineMinion({ ...hs("Cobra empereur", 3), attack: 2, health: 3 }, { isPoisonous: true }),
    defineMinion(
        { ...hs("Patriarche dos-argenté", 3), attack: 1, health: 4 },
        { tags: ["BEAST"], hasTaunt: true },
    ),
    defineMinion({ ...hs("Guerrier tauren", 3), attack: 2, health: 3 }, { hasTaunt: true }),
    defineMinion({ ...hs("Farseer de Thrallmar", 3), attack: 2, health: 3 }, { hasWindfury: true }),
    defineMinion({ ...hs("Maître brasseur", 4), attack: 4, health: 4 }),
    defineMinion({ ...hs("Chevalier de Hurlevent", 4), attack: 2, health: 5 }, { hasCharge: true }),
    defineMinion({ ...hs("Corsaire redoutable", 4), attack: 3, health: 3 }, { hasTaunt: true }),
    defineMinion({ ...hs("Dimetrodon", 5), attack: 5, health: 5 }, { tags: ["BEAST"] }),
    defineMinion({ ...hs("Leeroy Jenkins", 5), attack: 6, health: 2 }, { hasCharge: true }),
    defineMinion({ ...hs("Rampant des fondrières", 5), attack: 3, health: 6 }, { hasTaunt: true }),
    defineMinion({ ...hs("Commandant argenté", 6), attack: 4, health: 2 }, { hasCharge: true }),
    defineMinion(
        { ...hs("Harpie furie des vents", 6), attack: 4, health: 5 },
        { hasWindfury: true },
    ),
    defineMinion({ ...hs("Seigneur de l'Arène", 6), attack: 6, health: 5 }, { hasTaunt: true }),
    defineMinion({ ...hs("Géant des mers", 10), attack: 8, health: 8 }),

    // --- 02_battlecry_seeder: draw/heal/damage battlecries ---
    defineMinion(
        { ...hs("Oracle luminescent", 3), attack: 2, health: 2 },
        {
            tags: ["MURLOC"],
            battlecryActions: [drawAction(2), enemyDrawAction(2)],
        },
    ),
    defineMinion(
        { ...hs("Mousquetaire de Forgefer", 3), attack: 2, health: 2 },
        {
            battlecryActions: [damageAction(1, targetedAnyCharacter(), true)],
        },
    ),
    defineMinion(
        { ...hs("Farseer du Cercle terrestre", 3), attack: 3, health: 3 },
        {
            battlecryActions: [healAction(3, allCharacters())],
        },
    ),
    defineMinion(
        { ...hs("Prêtresse d'Elune", 6), attack: 5, health: 4 },
        {
            battlecryActions: [healAction(4, allyHero())],
        },
    ),
    defineMinion(
        { ...hs("Chasseur de gros gibier", 3), attack: 4, health: 2 },
        {
            battlecryActions: [
                damageAction(4, targetedEnemyMinionWithComparison(attackGreaterThan(6)), true),
            ],
        },
    ),
    defineMinion(
        { ...hs("Tueur de kodo", 5), attack: 3, health: 5 },
        {
            battlecryActions: [
                damageAction(3, targetedEnemyMinionWithComparison(healthLessThan(4)), true),
            ],
        },
    ),
    defineMinion(
        { ...hs("Chasseur de bêtes", 3), attack: 2, health: 2 },
        {
            battlecryActions: [damageAction(2, targetedEnemyMinionWithTag("BEAST"), true)],
        },
    ),
    defineMinion(
        { ...hs("Guérisseur de terrain", 2), attack: 1, health: 3 },
        {
            battlecryActions: [healAction(2, targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        { ...hs("Tireur d'élite", 3), attack: 2, health: 2 },
        {
            battlecryActions: [damageAction(4, targetedEnemyMinion(), true)],
        },
    ),
    defineMinion(
        { ...hs("Tireur de précision", 3), attack: 2, health: 2 },
        {
            battlecryActions: [damageAction(4, targetedEnemyHero(), true)],
        },
    ),
    defineMinion(
        { ...hs("Exécuteur de Quel'Thalas", 3), attack: 3, health: 1 },
        {
            battlecryActions: [
                damageAction(3, targetedEnemyMinionWithComparison(costEquals(4)), true),
            ],
        },
    ),

    // --- 02_battlecry_seeder: boost battlecries ---
    defineMinion(
        { ...hs("Voyant luminescent", 3), attack: 2, health: 3 },
        {
            tags: ["MURLOC"],
            battlecryActions: [boostAction(boostHealth(2), otherAllyMinionsWithTag("MURLOC"))],
        },
    ),
    defineMinion(
        { ...hs("Défenseur d'Argus", 4), attack: 2, health: 3 },
        {
            battlecryActions: [
                boostAction(boostBoth(1, 1), allyMinions()),
                boostAction(boostTaunt(), allyMinions()),
            ],
        },
    ),
    defineMinion(
        { ...hs("Nain de Sombrefer", 4), attack: 4, health: 4 },
        {
            battlecryActions: [boostAction(boostAttack(2), targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        { ...hs("Mage ancien", 4), attack: 2, health: 5 },
        {
            battlecryActions: [boostAction(boostSpellPower(2), allyHero())],
        },
    ),
    defineMinion(
        { ...hs("Sergent abusif", 1), attack: 2, health: 1 },
        {
            battlecryActions: [boostAction(boostAttack(2), targetedEnemyMinion(), true)],
        },
    ),

    // --- 02_battlecry_seeder: filtered draw battlecries ---
    defineMinion(
        { ...hs("Drake du Crépuscule", 4), attack: 4, health: 1 },
        {
            battlecryActions: [drawAction(1, minionDrawFilter([], costEquals(1)))],
        },
    ),
    defineMinion(
        { ...hs("Maître-naturaliste", 2), attack: 2, health: 2 },
        {
            battlecryActions: [drawAction(1, minionDrawFilter(["BEAST"]))],
        },
    ),
    defineMinion(
        { ...hs("Espion luminescent", 2), attack: 2, health: 2 },
        {
            tags: ["MURLOC"],
            battlecryActions: [enemyDrawAction(1, minionDrawFilter([], costEquals(1)))],
        },
    ),
    defineMinion({ ...hs("Tigre de Strangleronce", 5), attack: 5, health: 5 }, { tags: ["BEAST"] }),

    // --- 03_deathrattle_seeder ---
    defineMinion(
        { ...hs("Gnome lépreux", 1), attack: 2, health: 1 },
        {
            deathrattleActions: [damageAction(2, enemyHero())],
        },
    ),
    defineMinion(
        { ...hs("Glaneur de butin", 2), attack: 2, health: 1 },
        {
            deathrattleActions: [drawAction(1)],
        },
    ),
    defineMinion(
        { ...hs("Abomination", 5), attack: 4, health: 4 },
        {
            hasTaunt: true,
            deathrattleActions: [damageAction(2, allCharacters())],
        },
    ),
    defineMinion(
        { ...hs("Mage de sang Thalnos", 2), attack: 1, health: 1 },
        {
            deathrattleActions: [drawAction(1)],
            passives: [boostPassive(boostSpellPower(1), allyHero())],
        },
    ),
    defineMinion(
        { ...hs("Spectre apaisant", 2), attack: 2, health: 1 },
        {
            deathrattleActions: [healAction(3, allyHero())],
        },
    ),

    // --- 04_spell_seeder ---
    defineSpell(hs("Lance-tonneau", 1), damageAction(2, enemyHero())),
    defineSpell(hs("Piétinement", 2), damageAction(2, allEnemies())),
    defineSpell(hs("Hogger Frappe !", 4), damageAction(4, enemyHero())),
    defineSpell(hs("Héritage de l'Empereur", 3), boostAction(boostBoth(2, 2), allyMinions())),
    defineSpell(hs("Salve ardente", 3), damageAction(1, randomEnemyTargets(5))),

    // --- 05_weapon_seeder ---
    defineWeapon({ ...hs("Warglaive d'Azzinoth", 2), damage: 2, durability: 2 }),
    defineWeapon({ ...hs("Doubles warglaives", 6), damage: 4, durability: 2 }),

    // --- 06_passive_seeder ---
    defineMinion(
        { ...hs("Baron Geddon", 7), attack: 7, health: 5 },
        {
            passives: [actionPassive("TURN_END", damageAction(2, otherCharacters()))],
        },
    ),
    defineMinion(
        { ...hs("Ragnaros le Seigneur du Feu", 8), attack: 8, health: 8 },
        {
            passives: [actionPassive("TURN_END", damageAction(8, randomEnemyCharacter()))],
        },
    ),
    defineMinion(
        { ...hs("Gardien de la Lumière", 1), attack: 1, health: 2 },
        {
            passives: [actionPassive("HEAL", damageAction(2, enemyHero()))],
        },
    ),
    defineMinion(
        { ...hs("Démolisseur", 3), attack: 1, health: 4 },
        {
            passives: [actionPassive("TURN_BEGIN", damageAction(2, randomEnemyMinion()))],
        },
    ),
    defineMinion(
        { ...hs("Commissaire-priseur de Gadgetzan", 6), attack: 4, health: 4 },
        {
            passives: [actionPassive("DRAW", drawAction(1))],
        },
    ),
    defineMinion(
        { ...hs("Chef de guerre murloc", 3), attack: 3, health: 3 },
        {
            tags: ["MURLOC"],
            passives: [boostPassive(boostAttack(2), otherAllyMinionsWithTag("MURLOC"))],
        },
    ),
    defineMinion(
        { ...hs("Capitaine des mers du Sud", 3), attack: 3, health: 3 },
        {
            tags: ["PIRATE"],
            passives: [boostPassive(boostBoth(1, 1), otherAllyMinionsWithTag("PIRATE"))],
        },
    ),
    defineMinion(
        { ...hs("Malygos", 9), attack: 4, health: 12 },
        {
            passives: [boostPassive(boostSpellPower(5), allyHero())],
        },
    ),
];
