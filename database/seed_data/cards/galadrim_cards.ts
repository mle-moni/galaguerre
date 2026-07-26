import { GALADRIM_CARD_SET_NAME } from "../card_set_names.js";
import { getGaladrimCardImage } from "../galadrim_card_images.js";
import {
    actionPassive,
    allyHero,
    allyMinions,
    allMinions,
    attackAtMost,
    attackGreaterThan,
    boostAction,
    boostAdjacentAlliesAction,
    boostAttack,
    boostAttackWithCharge,
    boostAttackWithStealth,
    boostBoth,
    boostBothWithTaunt,
    boostCharge,
    boostHealth,
    boostPassive,
    boostSpellPower,
    boostStealth,
    costLessThan,
    costEquals,
    costMoreThan,
    damageAction,
    deckCardAddAction,
    deckCardAddFromTargetAction,
    deckCardDuplicateFromEventAction,
    deckCardDeleteAddedAction,
    defeatAction,
    destroyAction,
    defineMinion,
    defineSpell,
    defineWeapon,
    discoverAction,
    discoverOpponentDeckAction,
    cardDrawFilter,
    drawAction,
    drawOrAction,
    enemyDrawAction,
    enemyHero,
    enemyMinions,
    healthEquals,
    onTargetSurvivedWithHealth,
    handCardAddAction,
    healAction,
    minionDrawFilter,
    mindControlAction,
    manaTemporaryChangeAction,
    manaTemporaryChangePerOpponentMinionAction,
    nextSpellCostReductionAction,
    otherAllyMinions,
    otherAllyMinionsWithTag,
    otherMinionsWithTag,
    randomAllyMinionWithTag,
    randomEnemyCharacter,
    randomEnemyMinion,
    randomEnemyMinions,
    reconversionToCardId,
    reconversionAction,
    reconvertParameters,
    relativeCostReconversion,
    returnToHandAction,
    selfMinion,
    silenceAction,
    summonCardId,
    summonCardIdPerOpponentDeckCard,
    summonRandomMinionFromHandAction,
    spellDrawFilter,
    spellDiscoverFilter,
    targetedAllyMinion,
    targetedAllyMinionWithComparison,
    targetedAnyCharacter,
    targetedAnyMinion,
    targetedAnyMinionWithComparison,
    targetedEnemyMinion,
    type CardSeedEntry,
    boostAttackWithDivineShield,
    boostDivineShield,
    boostExtraBattlecryTriggers,
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
            goldenVideoUrl: "/card-videos/stagiaire-dev.mp4",
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
            goldenVideoUrl: "/card-videos/stagiaire-planque.mp4",
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
        160,
        {
            ...gal("Stagiaire de l'X", 1),
            imageUrl: "/card-covers/galadrim/stagiaire-x.webp",
            goldenVideoUrl: "/card-videos/stagiaire-x.mp4",
            attack: 2,
            health: 1,
        },
        {
            minionPowers: {
                hasCharge: true,
            },
            passives: [actionPassive("TURN_END", damageAction(1, selfMinion()))],
        },
    ),
    defineMinion(
        63,
        {
            ...gal("Dev Front-End", 2),
            imageUrl: "/card-covers/galadrim/dev-front-end.webp",
            goldenVideoUrl: "/card-videos/dev-front-end.mp4",
            attack: 2,
            health: 2,
        },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [healAction(3, allyHero())],
        },
    ),
    defineMinion(
        64,
        {
            ...gal("Dev Back-End", 2),
            imageUrl: "/card-covers/galadrim/dev-back-end.webp",
            goldenVideoUrl: "/card-videos/dev-back-end.mp4",
            attack: 2,
            health: 3,
        },
        {
            tags: ["DEVELOPPEUR"],
            deathrattleActions: [drawAction(1, minionDrawFilter(["DEVELOPPEUR"]))],
        },
    ),
    defineMinion(
        150,
        {
            ...gal("Mentor Technique", 2),
            imageUrl: "/card-covers/galadrim/mentor-technique.webp",
            goldenVideoUrl: "/card-videos/mentor-technique.mp4",
            attack: 2,
            health: 3,
        },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [discoverAction(cardDrawFilter(costEquals(1)))],
        },
        { rarity: "COMMON" },
    ),
    defineMinion(
        152,
        {
            ...gal("A/B testeur", 2),
            imageUrl: "/card-covers/galadrim/ab-testeur.webp",
            goldenVideoUrl: "/card-videos/ab-testeur.mp4",
            attack: 1,
            health: 1,
        },
        {
            battlecryActions: [discoverAction(cardDrawFilter(costEquals(3)))],
        },
        { rarity: "COMMON" },
    ),
    defineMinion(
        65,
        {
            ...gal("Dev Aigri", 3),
            imageUrl: "/card-covers/galadrim/dev-aigri.webp",
            goldenVideoUrl: "/card-videos/dev-aigri.mp4",
            attack: 1,
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
            goldenVideoUrl: "/card-videos/qa-testeur-impitoyable.mp4",
            attack: 1,
            health: 4,
        },
        {
            tags: ["DEVELOPPEUR"],
            minionPowers: {
                isPoisonous: true,
            },
        },
        { rarity: "RARE" },
    ),
    defineMinion(
        192,
        {
            ...gal("Spécialiste OSINT", 4),
            imageUrl: "/card-covers/galadrim/specialiste-osint.webp",
            goldenVideoUrl: "/card-videos/specialiste-osint.mp4",
            attack: 4,
            health: 5,
        },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [discoverOpponentDeckAction()],
        },
        { rarity: "EPIC" },
    ),
    defineMinion(
        174,
        {
            ...gal("Dev en Passation", 3),
            imageUrl: "/card-covers/galadrim/dev-en-passation.webp",
            goldenVideoUrl: "/card-videos/dev-en-passation.mp4",
            attack: 4,
            health: 4,
        },
        {
            tags: ["DEVELOPPEUR"],
            deathrattleActions: [enemyDrawAction(1)],
        },
    ),
    defineMinion(
        191,
        {
            ...gal("Développeur Fatigué", 3),
            imageUrl: "/card-covers/galadrim/developpeur-fatigue.webp",
            attack: 3,
            health: 3,
        },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [deckCardAddAction(185, 1, { targetTeam: "OPPONENT" })],
        },
    ),
    defineMinion(
        178,
        {
            ...gal("Valentin", 3),
            imageUrl: "/card-covers/galadrim/valentin.webp",
            attack: 2,
            health: 4,
        },
        {
            tags: ["DEVELOPPEUR"],
            passives: [boostPassive(boostExtraBattlecryTriggers(1), allyHero())],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        180,
        {
            ...gal("Alexis", 3),
            imageUrl: "/card-covers/galadrim/alexis-t.webp",
            goldenVideoUrl: "/card-videos/alexis.mp4",
            attack: 3,
            health: 2,
        },
        {
            tags: ["DEVELOPPEUR"],
            passives: [actionPassive("HERO_ATTACK", boostAction(boostBoth(1, 2), selfMinion()))],
        },
        { rarity: "RARE" },
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
            goldenVideoUrl: "/card-videos/dev-insomniaque.mp4",
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
            goldenVideoUrl: "/card-videos/architecte-systeme.mp4",
            attack: 5,
            health: 5,
        },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [damageAction(5, targetedEnemyMinion(), true)],
        },
    ),
    defineMinion(
        176,
        {
            ...gal("Molly", 7),
            imageUrl: "/card-covers/galadrim/molly.webp",
            goldenVideoUrl: "/card-videos/molly.mp4",
            attack: 4,
            health: 6,
        },
        {
            tags: ["DEVELOPPEUR", "PETS"],
            passives: [boostPassive(boostSpellPower(1), allyHero())],
            battlecryActions: [handCardAddAction(120)],
            deathrattleActions: [
                drawOrAction(1, [minionDrawFilter(["DEVELOPPEUR"]), minionDrawFilter(["PETS"])]),
            ],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        169,
        {
            ...gal("Head of Emojis", 8),
            imageUrl: "/card-covers/galadrim/head-of-emojis.webp",
            goldenVideoUrl: "/card-videos/head-of-emojis.mp4",
            attack: 6,
            health: 6,
        },
        {
            tags: ["DEVELOPPEUR"],
            battlecryActions: [
                discoverAction(spellDiscoverFilter({ labelTags: ["EMOJI"] })),
                discoverAction(spellDiscoverFilter({ labelTags: ["EMOJI"] })),
            ],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        177,
        {
            ...gal("Jean", 4),
            imageUrl: "/card-covers/galadrim/jean.webp",
            goldenVideoUrl: "/card-videos/jean.mp4",
            attack: 2,
            health: 4,
        },
        {
            tags: ["DEVELOPPEUR", "SALES"],
            minionPowers: {
                hasStealth: true,
            },
            attackActions: [discoverAction(minionDrawFilter())],
            deathrattleActions: [handCardAddAction(112)],
        },
        { rarity: "LEGENDARY" },
    ),

    // --- PM minions ---
    defineMinion(
        70,
        {
            ...gal("PM Junior", 1),
            imageUrl: "/card-covers/galadrim/pm-junior.webp",
            goldenVideoUrl: "/card-videos/pm-junior.mp4",
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
            goldenVideoUrl: "/card-videos/pm-stresse.mp4",
            attack: 3,
            health: 2,
        },
        {
            tags: ["PM"],
            battlecryActions: [
                boostAction(boostCharge(), targetedAllyMinionWithComparison(attackAtMost(3)), true),
            ],
        },
    ),
    defineMinion(
        73,
        {
            ...gal("Product Owner", 4),
            imageUrl: "/card-covers/galadrim/product-owner.webp",
            goldenVideoUrl: "/card-videos/product-owner.mp4",
            attack: 3,
            health: 5,
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
            goldenVideoUrl: "/card-videos/directeur-de-projet.mp4",
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
            goldenVideoUrl: "/card-videos/agiliste-convaincu.mp4",
            attack: 1,
            health: 4,
        },
        {
            tags: ["PM"],
            passives: [actionPassive("TURN_END", healAction(2, otherAllyMinions()))],
        },
    ),
    defineMinion(
        184,
        {
            ...gal("Recadreur de scope", 5),
            imageUrl: "/card-covers/galadrim/recadreur-de-scope.webp",
            goldenVideoUrl: "/card-videos/recadreur-de-scope.mp4",
            attack: 5,
            health: 5,
        },
        {
            tags: ["PM"],
            battlecryActions: [deckCardDeleteAddedAction()],
        },
        { rarity: "RARE" },
    ),
    defineMinion(
        188,
        {
            ...gal("Testeur nonchalant", 3),
            imageUrl: "/card-covers/galadrim/testeur-nonchalant.webp",
            attack: 2,
            health: 2,
        },
        {
            tags: ["PM"],
            passives: [
                actionPassive("TURN_END", deckCardAddAction(185, 1, { targetTeam: "OPPONENT" })),
            ],
        },
        { rarity: "RARE" },
    ),

    // --- sales / support minions ---
    defineMinion(
        76,
        {
            ...gal("BizDev Débutant", 1),
            imageUrl: "/card-covers/galadrim/bizdev-debutant.webp",
            goldenVideoUrl: "/card-videos/bizdev-debutant.mp4",
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
            ...gal("Sales Charismatique", 3),
            imageUrl: "/card-covers/galadrim/sales-charismatique.webp",
            goldenVideoUrl: "/card-videos/sales-charismatique.mp4",
            attack: 2,
            health: 2,
        },
        {
            tags: ["SALES"],
            battlecryActions: [drawAction(2), enemyDrawAction(2)],
        },
        { rarity: "RARE" },
    ),
    defineMinion(
        78,
        {
            ...gal("Closer Affamé", 3),
            imageUrl: "/card-covers/galadrim/closer-affame.webp",
            goldenVideoUrl: "/card-videos/closer-affame.mp4",
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
            goldenVideoUrl: "/card-videos/negociateur.mp4",
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
            goldenVideoUrl: "/card-videos/key-account-manager.mp4",
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
            goldenVideoUrl: "/card-videos/directeur-commercial.mp4",
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
            goldenVideoUrl: "/card-videos/agent-support.mp4",
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
            goldenVideoUrl: "/card-videos/happiness-manager.mp4",
            attack: 2,
            health: 3,
        },
        {
            tags: ["SUPPORT"],
            battlecryActions: [healAction(4, targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        173,
        {
            ...gal("Responsable du staffing", 2),
            imageUrl: "/card-covers/galadrim/responsable-du-staffing.webp",
            goldenVideoUrl: "/card-videos/responsable-du-staffing.mp4",
            attack: 3,
            health: 2,
        },
        {
            tags: ["SUPPORT"],
            battlecryActions: [returnToHandAction(0, targetedAllyMinion(), true)],
        },
    ),
    defineMinion(
        84,
        {
            ...gal("Recruteur RH", 3),
            imageUrl: "/card-covers/galadrim/recruteur-rh.webp",
            goldenVideoUrl: "/card-videos/recruteur-rh.mp4",
            attack: 2,
            health: 4,
        },
        {
            tags: ["SUPPORT"],
            battlecryActions: [drawAction(1, minionDrawFilter([], costLessThan(4)))],
        },
    ),
    defineMinion(
        182,
        {
            ...gal("Buddy Charismatique", 5),
            imageUrl: "/card-covers/galadrim/buddy-charismatique.webp",
            goldenVideoUrl: "/card-videos/buddy-charismatique.mp4",
            attack: 2,
            health: 3,
        },
        {
            tags: ["SUPPORT"],
            battlecryActions: [summonCardId(181, 3)],
        },
    ),
    defineMinion(
        183,
        {
            ...gal("Auditeur RGPD", 2),
            imageUrl: "/card-covers/galadrim/auditeur-rgpd.webp",
            attack: 2,
            health: 6,
        },
        {
            tags: ["SUPPORT"],
            minionPowers: {
                hasTaunt: true,
            },
            battlecryActions: [summonRandomMinionFromHandAction("OPPONENT")],
        },
        { rarity: "EPIC" },
    ),
    defineMinion(
        151,
        {
            ...gal("Léa", 4),
            imageUrl: "/card-covers/galadrim/lea.webp",
            goldenVideoUrl: "/card-videos/lea.mp4",
            attack: 3,
            health: 3,
        },
        {
            tags: ["SUPPORT"],
            battlecryActions: [discoverAction({ ...cardDrawFilter(), rarity: "LEGENDARY" })],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        130,
        {
            ...gal("Avocat d'Affaires", 5),
            imageUrl: "/card-covers/galadrim/avocat-d-affaires.webp",
            goldenVideoUrl: "/card-videos/avocat-d-affaires.mp4",
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
            goldenVideoUrl: "/card-videos/membre-du-cse.mp4",
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
            attack: 2,
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
            goldenVideoUrl: "/card-videos/balin.mp4",
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
            goldenVideoUrl: "/card-videos/fanny.mp4",
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
            goldenVideoUrl: "/card-videos/vincent.mp4",
            attack: 7,
            health: 7,
        },
        {
            tags: ["PM"],
            dynamicCost: { reductions: [{ source: "HAND_CARD_COUNT", amountPer: 1 }] },
        },
        { rarity: "EPIC" },
    ),

    // --- regional / pets minions ---
    defineMinion(
        87,
        {
            ...gal("Parisien Pressé", 2),
            imageUrl: "/card-covers/galadrim/parisien-presse.webp",
            goldenVideoUrl: "/card-videos/parisien-presse.mp4",
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
            goldenVideoUrl: "/card-videos/bobo-parisien.mp4",
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
            goldenVideoUrl: "/card-videos/nantais-detendu.mp4",
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
            tags: ["NANTAIS", "DESIGNER"],
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
            ...gal("Sully JR", 1),
            imageUrl: "/card-covers/galadrim/sully-jr.webp",
            goldenVideoUrl: "/card-videos/sully-jr.mp4",
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
            goldenVideoUrl: "/card-videos/chat-sur-le-clavier.mp4",
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
            goldenVideoUrl: "/card-videos/chien-foufou.mp4",
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
        154,
        {
            ...gal("Neva", 3),
            imageUrl: "/card-covers/galadrim/neva.webp",
            goldenVideoUrl: "/card-videos/neva.mp4",
            attack: 2,
            health: 3,
        },
        {
            tags: ["PETS"],
            battlecryActions: [boostAction(boostHealth(2), otherAllyMinionsWithTag("PETS"))],
        },
        { rarity: "RARE" },
    ),
    defineMinion(
        156,
        {
            ...gal("Papuche", 2),
            imageUrl: "/card-covers/galadrim/papuche.webp",
            goldenVideoUrl: "/card-videos/papuche.mp4",
            attack: 2,
            health: 1,
        },
        {
            tags: ["PETS"],
            battlecryActions: [summonCardId(155)],
        },
    ),
    defineMinion(
        157,
        {
            ...gal("Koda", 1),
            imageUrl: "/card-covers/galadrim/koda.webp",
            goldenVideoUrl: "/card-videos/koda.mp4",
            attack: 1,
            health: 2,
        },
        {
            tags: ["PETS"],
            passives: [
                actionPassive(
                    "SUMMON",
                    boostAction(boostAttack(1), selfMinion()),
                    null,
                    null,
                    minionDrawFilter(["PETS"]),
                ),
            ],
        },
        { rarity: "RARE" },
    ),
    defineMinion(
        158,
        {
            ...gal("Aloy", 3),
            imageUrl: "/card-covers/galadrim/aloy.webp",
            goldenVideoUrl: "/card-videos/aloy.mp4",
            attack: 3,
            health: 3,
        },
        {
            tags: ["PETS"],
            passives: [boostPassive(boostBoth(2, 1), otherAllyMinionsWithTag("PETS"))],
        },
        { rarity: "EPIC" },
    ),
    defineMinion(
        190,
        {
            ...gal("Perroquet de l'open space", 4),
            imageUrl: "/card-covers/galadrim/perroquet-de-l-open-space.webp",
            goldenVideoUrl: "/card-videos/perroquet-de-l-open-space.mp4",
            attack: 4,
            health: 4,
        },
        {
            tags: ["PETS"],
            passives: [actionPassive("DECK_CARD_ADD", deckCardDuplicateFromEventAction())],
        },
        { rarity: "EPIC" },
    ),
    defineMinion(
        159,
        {
            ...gal("OG Sully", 4),
            imageUrl: "/card-covers/galadrim/sully.webp",
            goldenVideoUrl: "/card-videos/og-sully.mp4",
            attack: 2,
            health: 4,
        },
        {
            tags: ["PETS"],
            minionPowers: {
                hasCharge: true,
            },
            passives: [boostPassive(boostAttack(1), otherMinionsWithTag("PETS"), true)],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        162,
        {
            ...gal("Princesse", 2),
            imageUrl: "/card-covers/galadrim/princesse.webp",
            goldenVideoUrl: "/card-videos/princesse.mp4",
            attack: 1,
            health: 1,
        },
        {
            tags: ["PETS"],
            minionPowers: {
                hasTaunt: true,
            },
            deathrattleActions: [
                boostAction(boostAttackWithDivineShield(2), randomAllyMinionWithTag("PETS")),
            ],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        95,
        {
            ...gal("Plante Verte", 1),
            imageUrl: "/card-covers/galadrim/plante-verte.webp",
            goldenVideoUrl: "/card-videos/plante-verte.mp4",
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
            goldenVideoUrl: "/card-videos/pm-en-teletravail.mp4",
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
    defineMinion(
        161,
        {
            ...gal("La Phonebox", 2),
            imageUrl: "/card-covers/galadrim/phone-box.webp",
            goldenVideoUrl: "/card-videos/phone-box.mp4",
            attack: 0,
            health: 4,
        },
        {
            minionPowers: {
                hasTaunt: true,
            },
            battlecryActions: [boostAdjacentAlliesAction(boostStealth())],
        },
        { rarity: "RARE" },
    ),

    // --- play-card trigger minions ---
    defineMinion(
        115,
        {
            ...gal("Commère de l'Open Space", 2),
            imageUrl: "/card-covers/galadrim/commere-de-l-open-space.webp",
            goldenVideoUrl: "/card-videos/commere-de-l-open-space.mp4",
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
        { rarity: "RARE" },
    ),
    defineMinion(
        116,
        {
            ...gal("Office Manager Dévoué", 3),
            imageUrl: "/card-covers/galadrim/office-manager-devoue.webp",
            goldenVideoUrl: "/card-videos/office-manager-devoue.mp4",
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
            goldenVideoUrl: "/card-videos/alternant-surmotive.mp4",
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
            goldenVideoUrl: "/card-videos/distributeur-de-croquettes.mp4",
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
            goldenVideoUrl: "/card-videos/devops-en-sueur.mp4",
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
            goldenVideoUrl: "/card-videos/leo.mp4",
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
            goldenVideoUrl: "/card-videos/pause-cafe.mp4",
        },
        [boostAction(boostBoth(1, 1), allyMinions())],
    ),
    defineSpell(
        97,
        {
            ...gal("Bug en Prod", 4),
            imageUrl: "/card-covers/galadrim/bug-en-prod.webp",
            goldenVideoUrl: "/card-videos/bug-en-prod.mp4",
        },
        [damageAction(3, allMinions())],
    ),
    defineSpell(
        98,
        {
            ...gal("Déploiement Réussi", 3),
            imageUrl: "/card-covers/galadrim/deploiement-reussi.webp",
            goldenVideoUrl: "/card-videos/deploiement-reussi.mp4",
        },
        [drawAction(2)],
    ),
    defineSpell(
        99,
        {
            ...gal("Réunion Interminable", 5),
            imageUrl: "/card-covers/galadrim/reunion-interminable.webp",
            goldenVideoUrl: "/card-videos/reunion-interminable.mp4",
        },
        [damageAction(3, enemyMinions())],
    ),
    defineSpell(
        100,
        {
            ...gal("Sprint Review", 4),
            imageUrl: "/card-covers/galadrim/sprint-review.webp",
            goldenVideoUrl: "/card-videos/sprint-review.mp4",
        },
        [boostAction(boostBothWithTaunt(3, 3), targetedAllyMinion(), true)],
    ),
    defineSpell(
        101,
        {
            ...gal("Heures Sup'", 3),
            imageUrl: "/card-covers/galadrim/heures-sup.webp",
            goldenVideoUrl: "/card-videos/heures-sup.mp4",
        },
        [boostAction(boostAttackWithCharge(2), targetedAllyMinion(), true)],
        [],
        { rarity: "RARE" },
    ),
    defineSpell(
        102,
        {
            ...gal("Burnout", 3),
            imageUrl: "/card-covers/galadrim/burnout.webp",
            goldenVideoUrl: "/card-videos/burnout.mp4",
        },
        [destroyAction(targetedAnyMinionWithComparison(attackGreaterThan(4)), true)],
    ),
    defineSpell(
        132,
        {
            ...gal("Fin de Période d'Essai", 2),
            imageUrl: "/card-covers/galadrim/fin-de-periode-d-essai.webp",
            goldenVideoUrl: "/card-videos/fin-de-periode-d-essai.mp4",
        },
        [destroyAction(targetedAnyMinionWithComparison(costLessThan(4)), true)],
    ),
    defineSpell(
        133,
        {
            ...gal("Licenciement pour Faute", 5),
            imageUrl: "/card-covers/galadrim/licenciement-pour-faute.webp",
            goldenVideoUrl: "/card-videos/licenciement-pour-faute.mp4",
        },
        [destroyAction(targetedAnyMinion(), true)],
    ),
    defineSpell(
        134,
        {
            ...gal("Licenciement collectif", 8),
            imageUrl: "/card-covers/galadrim/licenciement-collectif.webp",
            goldenVideoUrl: "/card-videos/licenciement-collectif.mp4",
        },
        [destroyAction(allMinions())],
        [],
        { rarity: "EPIC" },
    ),
    defineSpell(
        135,
        {
            ...gal("Optimisation Salariale", 1),
            imageUrl: "/card-covers/galadrim/optimisation-salariale.webp",
            goldenVideoUrl: "/card-videos/optimisation-salariale.mp4",
        },
        [destroyAction(targetedAllyMinion(), true), drawAction(2)],
    ),
    defineSpell(
        179,
        {
            ...gal("Mise en prod du vendredi", 7),
            imageUrl: "/card-covers/galadrim/mise-en-prod-du-vendredi.webp",
            goldenVideoUrl: "/card-videos/mise-en-prod-du-vendredi.mp4",
        },
        [destroyAction(targetedAnyMinion(), true), summonCardId(64), summonCardId(63)],
        [],
        { rarity: "EPIC" },
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
            goldenVideoUrl: "/card-videos/goodies-galadrim.mp4",
        },
        [healAction(5, targetedAllyMinion(), true)],
    ),
    defineSpell(
        149,
        {
            ...gal("Recherche Google", 1),
            imageUrl: "/card-covers/galadrim/recherche-google.webp",
            goldenVideoUrl: "/card-videos/recherche-google.mp4",
        },
        [discoverAction(spellDrawFilter())],
    ),
    defineSpell(
        153,
        {
            ...gal("Zoothérapie", 3),
            imageUrl: "/card-covers/galadrim/zootherapie.webp",
        },
        [discoverAction(minionDrawFilter(["PETS"])), discoverAction(minionDrawFilter(["PETS"]))],
        [],
        { rarity: "RARE" },
    ),
    defineSpell(
        105,
        {
            ...gal("Coupure Internet", 6),
            imageUrl: "/card-covers/galadrim/coupure-internet.webp",
            goldenVideoUrl: "/card-videos/coupure-internet.mp4",
        },
        [damageAction(4, randomEnemyMinions(3))],
        [],
        { rarity: "EPIC" },
    ),
    defineSpell(
        109,
        {
            ...gal("Lendemain de soirée", 1),
            imageUrl: "/card-covers/galadrim/lendemain-de-soiree.webp",
            goldenVideoUrl: "/card-videos/lendemain-de-soiree.mp4",
        },
        [silenceAction(targetedAnyMinion(), true), damageAction(1, targetedAnyMinion(), true)],
    ),
    defineSpell(
        110,
        {
            ...gal("Casque à Réduction de Bruit", 1),
            imageUrl: "/card-covers/galadrim/casque-reduction-bruit.webp",
            goldenVideoUrl: "/card-videos/casque-reduction-bruit.mp4",
        },
        [boostAction(boostDivineShield(), targetedAllyMinion(), true)],
        [],
        { rarity: "EPIC" },
    ),
    defineSpell(
        112,
        {
            ...gal("Masque du CEO", 1),
            imageUrl: "/card-covers/galadrim/masque-du-ceo.webp",
            goldenVideoUrl: "/card-videos/masque-du-ceo.mp4",
        },
        [boostAction(boostAttackWithStealth(2), targetedAnyMinion(), true)],
        [],
        { rarity: "RARE" },
    ),
    defineSpell(
        120,
        {
            ...gal("Jet de Ducros", 2),
            imageUrl: "/card-covers/galadrim/jet-de-ducros.webp",
            goldenVideoUrl: "/card-videos/jet-de-ducros.mp4",
        },
        [
            damageAction(2, targetedAnyMinion(), true, {
                onTargetResult: onTargetSurvivedWithHealth(healthEquals(1), drawAction(2)),
            }),
        ],
        [],
        { rarity: "RARE" },
    ),
    defineSpell(
        122,
        {
            ...gal("Doom scrolling", 4),
            imageUrl: "/card-covers/galadrim/doom-scrolling.webp",
            goldenVideoUrl: "/card-videos/doom-scrolling.mp4",
        },
        [reconversionToCardId(121, targetedAnyMinion(), true)],
    ),
    defineSpell(
        123,
        {
            ...gal("Levée de Fonds", 1),
            imageUrl: "/card-covers/galadrim/levee-de-fonds.webp",
            goldenVideoUrl: "/card-videos/levee-de-fonds.mp4",
        },
        [relativeCostReconversion(2, targetedAllyMinion(), true)],
    ),
    defineSpell(
        124,
        {
            ...gal("Coupe Budgétaire", 2),
            imageUrl: "/card-covers/galadrim/coupe-budgetaire.webp",
            goldenVideoUrl: "/card-videos/coupe-budgetaire.mp4",
        },
        [relativeCostReconversion(-1, enemyMinions())],
        [],
        { rarity: "RARE" },
    ),
    defineSpell(
        126,
        {
            ...gal("Congrès Tech", 5),
            imageUrl: "/card-covers/galadrim/congres-tech.webp",
            goldenVideoUrl: "/card-videos/congres-tech.mp4",
        },
        [
            reconversionAction(
                reconvertParameters({
                    tags: ["DEVELOPPEUR"],
                    comparison: costMoreThan(4),
                }),
                allMinions(),
            ),
        ],
        [],
        { rarity: "RARE" },
    ),
    defineSpell(
        127,
        {
            ...gal("Contrat Freelance", 3),
            imageUrl: "/card-covers/galadrim/contrat-freelance.webp",
            goldenVideoUrl: "/card-videos/contrat-freelance.mp4",
        },
        [reconversionToCardId(125, targetedAnyMinion(), true)],
    ),
    defineSpell(
        128,
        {
            ...gal("Débauchage", 9),
            imageUrl: "/card-covers/galadrim/debauchage.webp",
            goldenVideoUrl: "/card-videos/debauchage.mp4",
        },
        [mindControlAction(targetedEnemyMinion(), true)],
        [],
        { rarity: "EPIC" },
    ),
    defineSpell(
        170,
        {
            ...gal("Git Revert", 0),
            imageUrl: "/card-covers/galadrim/git-revert.webp",
            goldenVideoUrl: "/card-videos/git-revert.mp4",
        },
        [returnToHandAction(2, targetedAllyMinion(), true)],
    ),
    defineSpell(
        175,
        {
            ...gal("PR Refusée", 2),
            imageUrl: "/card-covers/galadrim/pr-refusee.webp",
            goldenVideoUrl: "/card-videos/pr-refusee.mp4",
        },
        [returnToHandAction(0, targetedEnemyMinion(), true)],
        [],
    ),
    defineSpell(
        172,
        {
            ...gal("Setup Technique", 0),
            imageUrl: "/card-covers/galadrim/setup-technique.webp",
            goldenVideoUrl: "/card-videos/setup-technique.mp4",
        },
        [nextSpellCostReductionAction(2)],
        [],
        { rarity: "EPIC" },
    ),
    defineMinion(
        129,
        {
            ...gal("Chasseur de Têtes", 3),
            imageUrl: "/card-covers/galadrim/chasseur-de-tetes.webp",
            goldenVideoUrl: "/card-videos/chasseur-de-tete.mp4",
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
        { rarity: "RARE" },
    ),
    defineMinion(
        139,
        {
            ...gal("Roi Mulak", 3),
            imageUrl: "/card-covers/galadrim/roi-mulak.webp",
            goldenVideoUrl: "/card-videos/roi-mulak.mp4",
            attack: 5,
            health: 5,
        },
        {
            battlecryActions: [handCardAddAction(140, 2, { targetTeam: "OPPONENT" })],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        141,
        {
            ...gal("Benjamin Influenceur", 5),
            imageUrl: "/card-covers/galadrim/benjamin-influenceur.webp",
            goldenVideoUrl: "/card-videos/benjamin-influenceur.mp4",
            attack: 3,
            health: 4,
        },
        {
            battlecryActions: [manaTemporaryChangePerOpponentMinionAction(1)],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        142,
        {
            ...gal("Arnaud", 5),
            imageUrl: "/card-covers/galadrim/arnaud.webp",
            goldenVideoUrl: "/card-videos/arnaud.mp4",
            attack: 5,
            health: 4,
        },
        {
            battlecryActions: [deckCardAddAction(143)],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        148,
        {
            ...gal("Joseph", 4),
            imageUrl: "/card-covers/galadrim/joseph.webp",
            goldenVideoUrl: "/card-videos/joseph.mp4",
            attack: 2,
            health: 8,
        },
        {
            minionPowers: {
                hasTaunt: true,
            },
            battlecryActions: [deckCardAddAction(147, 1, { placement: "BOTTOM" })],
        },
        { rarity: "LEGENDARY" },
    ),
    defineMinion(
        181,
        {
            ...gal("Nouvelle Recrue", 1),
            imageUrl: "/card-covers/galadrim/nouvelle-recrue.webp",
            goldenVideoUrl: "/card-videos/nouvelle-recrue.mp4",
            attack: 1,
            health: 1,
        },
        {
            minionPowers: {
                hasRush: true,
            },
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
            ...gal("Clavier Mécanique", 3),
            imageUrl: "/card-covers/galadrim/clavier-mecanique.webp",
            goldenVideoUrl: "/card-videos/clavier-mecanique.mp4",
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
            goldenVideoUrl: "/card-videos/cable-reseau.mp4",
            damage: 4,
            durability: 2,
        },
        { deathrattleActions: [damageAction(2, enemyMinions())] },
    ),
    defineWeapon(
        171,
        {
            ...gal("Gros Cahier des Charges", 2),
            imageUrl: "/card-covers/galadrim/gros-cahier-des-charges.webp",
            goldenVideoUrl: "/card-videos/gros-cahier-des-charges.mp4",
            damage: 3,
            durability: 2,
        },
        { cannotAttackHero: true },
    ),
    defineWeapon(
        189,
        {
            ...gal("Cahier des charges imprécis", 4),
            imageUrl: "/card-covers/galadrim/cahier-des-charges-imprecis.webp",
            damage: 3,
            durability: 2,
        },
        {
            heroAttackActions: [deckCardAddAction(185, 1, { targetTeam: "OPPONENT" })],
        },
        { rarity: "EPIC" },
    ),
    defineMinion(
        187,
        {
            ...gal("Head of dynamite", 7),
            imageUrl: "/card-covers/galadrim/head-of-dynamite.webp",
            attack: 7,
            health: 7,
        },
        {
            battlecryActions: [summonCardIdPerOpponentDeckCard(186, 185)],
        },
        { rarity: "LEGENDARY" },
    ),

    // --- cartes non collectionnables ---
    defineMinion(
        155,
        {
            ...gal("Plume", 1),
            imageUrl: "/card-covers/galadrim/plume.webp",
            attack: 1,
            health: 1,
        },
        { tags: ["PETS"] },
        { isCollectible: false },
    ),
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
    defineSpell(
        140,
        {
            ...gal("Bilan Carbone", 1),
            imageUrl: "/card-covers/galadrim/bilan-carbone.webp",
        },
        [boostAction(boostBoth(1, 1), targetedAllyMinion(), true)],
        [],
        { isCollectible: false },
    ),
    defineMinion(
        143,
        {
            ...gal("Boîte de Code Names", 1),
            imageUrl: "/card-covers/galadrim/boite-de-code-names.webp",
            attack: 0,
            health: 2,
        },
        {
            minionPowers: {
                hasTaunt: true,
            },
            deathrattleActions: [deckCardAddAction(142)],
            battlecryActions: [
                handCardAddAction(144),
                handCardAddAction(145),
                handCardAddAction(146),
            ],
        },
        { isCollectible: false },
    ),
    defineSpell(
        144,
        { ...gal("mot blanc", 1), imageUrl: "/card-covers/galadrim/mot-blanc.webp" },
        [drawAction(1)],
        [],
        { isCollectible: false },
    ),
    defineSpell(
        145,
        { ...gal("mot rouge", 2), imageUrl: "/card-covers/galadrim/mot-rouge.webp" },
        [damageAction(2, targetedAnyCharacter(), true)],
        [],
        { isCollectible: false },
    ),
    defineSpell(
        146,
        { ...gal("mot bleu", 0), imageUrl: "/card-covers/galadrim/mot-bleu.webp" },
        [healAction(2, targetedAnyCharacter(), true)],
        [],
        { isCollectible: false },
    ),
    defineSpell(
        147,
        { ...gal("mot noir", 0), imageUrl: "/card-covers/galadrim/mot-noir.webp" },
        [defeatAction("PLAYER")],
        [],
        { isCollectible: false },
        { castsWhenDrawn: true },
    ),
    defineSpell(
        163,
        {
            ...gal("Copier-Coller", 2),
            imageUrl: "/card-covers/galadrim/copier-coller.webp",
            goldenVideoUrl: "/card-videos/copier-coller.mp4",
        },
        [deckCardAddFromTargetAction(3, targetedAnyMinion())],
    ),
    defineSpell(
        164,
        {
            ...gal(":rage-fist:", 1),
            imageUrl: "/card-covers/galadrim/rage-fist.webp",
        },
        [
            damageAction(1, targetedAnyMinion(), true),
            boostAction(boostAttack(2), targetedAnyMinion(), true),
        ],
        [],
        { isCollectible: false },
        { labelTags: ["EMOJI"] },
    ),
    defineSpell(
        165,
        {
            ...gal(":sadge:", 2),
            imageUrl: "/card-covers/galadrim/sadge.webp",
        },
        [silenceAction(allMinions())],
        [],
        { isCollectible: false },
        { labelTags: ["EMOJI"] },
    ),
    defineSpell(
        166,
        {
            ...gal(":madge:", 3),
            imageUrl: "/card-covers/galadrim/madge.webp",
        },
        [damageAction(4, targetedAnyCharacter(), true)],
        [],
        { isCollectible: false },
        { labelTags: ["EMOJI"] },
    ),
    defineSpell(
        167,
        {
            ...gal(":pepe-dead:", 4),
            imageUrl: "/card-covers/galadrim/pepe-dead.webp",
        },
        [destroyAction(targetedAnyMinion(), true)],
        [],
        { isCollectible: false },
        { labelTags: ["EMOJI"] },
    ),
    defineSpell(
        168,
        {
            ...gal(":pogslide:", 5),
            imageUrl: "/card-covers/galadrim/pogslide.webp",
        },
        [drawAction(3)],
        [],
        { isCollectible: false },
        { labelTags: ["EMOJI"] },
    ),
    defineSpell(
        185,
        {
            ...gal("Bug à retardement", 0),
            imageUrl: "/card-covers/galadrim/bug-a-retardement.webp",
        },
        [damageAction(5, allyHero())],
        [],
        { isCollectible: false },
        { castsWhenDrawn: true },
    ),
    defineMinion(
        186,
        {
            ...gal("Bug explosif", 1),
            imageUrl: "/card-covers/galadrim/bug-explosif.webp",
            attack: 1,
            health: 1,
        },
        { deathrattleActions: [damageAction(3, randomEnemyCharacter())] },
        { isCollectible: false },
    ),
];
