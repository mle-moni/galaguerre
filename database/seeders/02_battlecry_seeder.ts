import Action from "#models/action";
import Boost from "#models/boost";
import Card from "#models/card";
import CardSet from "#models/card_set";
import CardFilter from "#models/card_filter";
import CardTag from "#models/card_tag";
import Comparison from "#models/comparison";
import Minion from "#models/minion";
import MinionBattlecryAction from "#models/minion_battlecry_action";
import MinionPower from "#models/minion_power";
import Tag from "#models/tag";
import Target from "#models/target";
import ToolToTarget from "#models/tool_to_target";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { HEARTHSTONE_CARD_SET_NAME } from "../seed_data/card_set_names.js";
import { getClassicCardImage } from "../seed_data/classic_card_images.js";

const nullActionFields = {
    drawCount: null,
    drawCardFilterId: null,
    enemyDrawCount: null,
    enemyDrawCardFilterId: null,
    damage: null,
    heal: null,
    boostId: null,
};

export default class extends BaseSeeder {
    async run() {
        const hearthstoneSet = await CardSet.findByOrFail("name", HEARTHSTONE_CARD_SET_NAME);

        const beastTag = await Tag.query().where("name", "beast").firstOrFail();

        const [murlocTag] = await Tag.createMany([
            { name: "murloc", symbol: "🐟", label: "Murloc" },
            { name: "pirate", symbol: "🏴‍☠️", label: "Pirate" },
        ]);

        const [drawTwoAction, enemyDrawTwoAction, healHeroFourAction, riflemanDamageAction] =
            await Action.createMany([
                {
                    internalLabel: "Oracle luminescent - Pioche 2 cartes",
                    type: "DRAW",
                    isTargeted: false,
                    ...nullActionFields,
                    drawCount: 2,
                },
                {
                    internalLabel: "Oracle luminescent - Adversaire pioche 2 cartes",
                    type: "ENEMY_DRAW",
                    isTargeted: false,
                    ...nullActionFields,
                    enemyDrawCount: 2,
                },
                {
                    internalLabel: "Prêtresse d'Elune - 4 soins au héros allié",
                    type: "HEAL",
                    isTargeted: false,
                    ...nullActionFields,
                    heal: 4,
                },
                {
                    internalLabel: "Mousquetaire de Forgefer - 1 dégât ciblé",
                    type: "DAMAGE",
                    isTargeted: true,
                    ...nullActionFields,
                    damage: 1,
                },
            ]);

        const [allyHeroTarget, anyCharacterTarget] = await Target.createMany([
            {
                internalLabel: "Héros allié",
                type: "HERO",
                targetTeam: "PLAYER",
                comparisonId: null,
                tagId: null,
            },
            {
                internalLabel: "Personnage (ciblé)",
                type: "ALL",
                targetTeam: "ALL",
                comparisonId: null,
                tagId: null,
            },
        ]);

        const farseerHealAction = await Action.create({
            internalLabel: "Farseer du Cercle terrestre - 3 soins à tous les personnages",
            type: "HEAL",
            isTargeted: false,
            ...nullActionFields,
            heal: 3,
        });

        const [oracleLuminescent, mousquetaireForgefer, farseerCercleTerrestre, pretresseElune] =
            await Minion.createMany([
                { internalLabel: "Oracle luminescent", attack: 2, health: 2 },
                { internalLabel: "Mousquetaire de Forgefer", attack: 2, health: 2 },
                { internalLabel: "Farseer du Cercle terrestre", attack: 3, health: 3 },
                { internalLabel: "Prêtresse d'Elune", attack: 5, health: 4 },
            ]);

        await ToolToTarget.createMany([
            { targetId: allyHeroTarget.id, actionId: healHeroFourAction.id, boostId: null },
            { targetId: anyCharacterTarget.id, actionId: riflemanDamageAction.id, boostId: null },
            { targetId: anyCharacterTarget.id, actionId: farseerHealAction.id, boostId: null },
        ]);

        await MinionBattlecryAction.createMany([
            { minionId: oracleLuminescent.id, actionId: drawTwoAction.id },
            { minionId: oracleLuminescent.id, actionId: enemyDrawTwoAction.id },
            { minionId: mousquetaireForgefer.id, actionId: riflemanDamageAction.id },
            { minionId: farseerCercleTerrestre.id, actionId: farseerHealAction.id },
            { minionId: pretresseElune.id, actionId: healHeroFourAction.id },
        ]);

        await Card.createMany([
            {
                label: "Oracle luminescent",
                imageUrl: getClassicCardImage("Oracle luminescent"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: oracleLuminescent.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Mousquetaire de Forgefer",
                imageUrl: getClassicCardImage("Mousquetaire de Forgefer"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: mousquetaireForgefer.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Farseer du Cercle terrestre",
                imageUrl: getClassicCardImage("Farseer du Cercle terrestre"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: farseerCercleTerrestre.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Prêtresse d'Elune",
                imageUrl: getClassicCardImage("Prêtresse d'Elune"),
                cost: 6,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: pretresseElune.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        const oracleCard = await Card.query().where("label", "Oracle luminescent").firstOrFail();
        await CardTag.create({ cardId: oracleCard.id, tagId: murlocTag.id });

        const bigGameComparison = await Comparison.create({
            costComparison: null,
            cost: null,
            attackComparison: ">",
            attack: 6,
            healthComparison: null,
            health: null,
        });

        const lowHealthComparison = await Comparison.create({
            costComparison: null,
            cost: null,
            attackComparison: null,
            attack: null,
            healthComparison: "<",
            health: 4,
        });

        const expensiveMinionComparison = await Comparison.create({
            costComparison: "=",
            cost: 4,
            attackComparison: null,
            attack: null,
            healthComparison: null,
            health: null,
        });

        const [
            targetedHeroDamageAction,
            targetedMinionDamageAction,
            targetedMinionHealAction,
            bigGameDamageAction,
            targetedBeastDamageAction,
            targetedLowHealthDamageAction,
            targetedExpensiveMinionDamageAction,
        ] = await Action.createMany([
            {
                internalLabel: "Chasseur de gros gibier - 4 dégâts ciblés héros",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 4,
            },
            {
                internalLabel: "Chasseur de gros gibier - 4 dégâts ciblés serviteur",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 4,
            },
            {
                internalLabel: "Soins ciblés serviteur allié",
                type: "HEAL",
                isTargeted: true,
                ...nullActionFields,
                heal: 2,
            },
            {
                internalLabel: "Chasseur de gros gibier - 4 dégâts attaque > 6",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 4,
            },
            {
                internalLabel: "Dégâts ciblés bête adverse",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 2,
            },
            {
                internalLabel: "Tueur de kodo - 3 dégâts pv < 4",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 3,
            },
            {
                internalLabel: "Dégâts ciblés serviteur coût = 4",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 3,
            },
        ]);

        const [
            targetedEnemyHeroTarget,
            targetedEnemyMinionTarget,
            targetedAllyMinionTarget,
            bigGameTarget,
            targetedBeastEnemyMinionTarget,
            targetedLowHealthEnemyMinionTarget,
            targetedExpensiveEnemyMinionTarget,
        ] = await Target.createMany([
            {
                internalLabel: "Héros adverse (ciblé)",
                type: "HERO",
                targetTeam: "OPPONENT",
                comparisonId: null,
                tagId: null,
            },
            {
                internalLabel: "Serviteur adverse (ciblé)",
                type: "MINION",
                targetTeam: "OPPONENT",
                comparisonId: null,
                tagId: null,
            },
            {
                internalLabel: "Serviteur allié (ciblé)",
                type: "MINION",
                targetTeam: "PLAYER",
                comparisonId: null,
                tagId: null,
            },
            {
                internalLabel: "Serviteur adverse attaque > 6 (ciblé)",
                type: "MINION",
                targetTeam: "OPPONENT",
                comparisonId: bigGameComparison.id,
                tagId: null,
            },
            {
                internalLabel: "Bête adverse (ciblé)",
                type: "MINION",
                targetTeam: "OPPONENT",
                comparisonId: null,
                tagId: beastTag.id,
            },
            {
                internalLabel: "Serviteur adverse pv < 4 (ciblé)",
                type: "MINION",
                targetTeam: "OPPONENT",
                comparisonId: lowHealthComparison.id,
                tagId: null,
            },
            {
                internalLabel: "Serviteur adverse coût = 4 (ciblé)",
                type: "MINION",
                targetTeam: "OPPONENT",
                comparisonId: expensiveMinionComparison.id,
                tagId: null,
            },
        ]);

        const [
            chasseurHero,
            chasseurMinion,
            soinsCibles,
            chasseurGrosGibier,
            chasseurBete,
            tueurKodo,
            chasseurCher,
        ] = await Minion.createMany([
            { internalLabel: "Chasseur héros", attack: 2, health: 2 },
            { internalLabel: "Chasseur serviteur", attack: 2, health: 2 },
            { internalLabel: "Soins ciblés", attack: 1, health: 3 },
            { internalLabel: "Chasseur de gros gibier", attack: 4, health: 2 },
            { internalLabel: "Chasseur bête", attack: 2, health: 2 },
            { internalLabel: "Tueur de kodo", attack: 3, health: 5 },
            { internalLabel: "Chasseur coûteux", attack: 3, health: 1 },
        ]);

        await ToolToTarget.createMany([
            {
                targetId: targetedEnemyHeroTarget.id,
                actionId: targetedHeroDamageAction.id,
                boostId: null,
            },
            {
                targetId: targetedEnemyMinionTarget.id,
                actionId: targetedMinionDamageAction.id,
                boostId: null,
            },
            {
                targetId: targetedAllyMinionTarget.id,
                actionId: targetedMinionHealAction.id,
                boostId: null,
            },
            { targetId: bigGameTarget.id, actionId: bigGameDamageAction.id, boostId: null },
            {
                targetId: targetedBeastEnemyMinionTarget.id,
                actionId: targetedBeastDamageAction.id,
                boostId: null,
            },
            {
                targetId: targetedLowHealthEnemyMinionTarget.id,
                actionId: targetedLowHealthDamageAction.id,
                boostId: null,
            },
            {
                targetId: targetedExpensiveEnemyMinionTarget.id,
                actionId: targetedExpensiveMinionDamageAction.id,
                boostId: null,
            },
        ]);

        await MinionBattlecryAction.createMany([
            { minionId: chasseurHero.id, actionId: targetedHeroDamageAction.id },
            { minionId: chasseurMinion.id, actionId: targetedMinionDamageAction.id },
            { minionId: soinsCibles.id, actionId: targetedMinionHealAction.id },
            { minionId: chasseurGrosGibier.id, actionId: bigGameDamageAction.id },
            { minionId: chasseurBete.id, actionId: targetedBeastDamageAction.id },
            { minionId: tueurKodo.id, actionId: targetedLowHealthDamageAction.id },
            { minionId: chasseurCher.id, actionId: targetedExpensiveMinionDamageAction.id },
        ]);

        await Card.createMany([
            {
                label: "Chasseur de gros gibier",
                imageUrl: getClassicCardImage("Chasseur de gros gibier"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: chasseurGrosGibier.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Tueur de kodo",
                imageUrl: getClassicCardImage("Tueur de kodo"),
                cost: 5,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: tueurKodo.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Chasseur de bêtes",
                imageUrl: getClassicCardImage("Chasseur de bêtes"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: chasseurBete.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Guérisseur de terrain",
                imageUrl: getClassicCardImage("Guérisseur de terrain"),
                cost: 2,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: soinsCibles.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Tireur d'élite",
                imageUrl: getClassicCardImage("Tireur d'élite"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: chasseurMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Tireur de précision",
                imageUrl: getClassicCardImage("Tireur de précision"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: chasseurHero.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Exécuteur de Quel'Thalas",
                imageUrl: getClassicCardImage("Exécuteur de Quel'Thalas"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: chasseurCher.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        const tauntPower = await MinionPower.query().where("hasTaunt", true).firstOrFail();

        const [boostPlusTwoHealth, boostPlusOneTaunt, boostPlusTwoAttack, boostSpellPower] =
            await Boost.createMany([
                {
                    internalLabel: "Voyant luminescent - +2 PV murlocs",
                    attack: null,
                    health: 2,
                    spellPower: null,
                    minionPowerId: null,
                },
                {
                    internalLabel: "Défenseur d'Argus - +1/+1",
                    attack: 1,
                    health: 1,
                    spellPower: null,
                    minionPowerId: null,
                },
                {
                    internalLabel: "Nain de Sombrefer - +2 attaque",
                    attack: 2,
                    health: null,
                    spellPower: null,
                    minionPowerId: null,
                },
                {
                    internalLabel: "Mage ancien - +2 dégâts de sort",
                    attack: null,
                    health: null,
                    spellPower: 2,
                    minionPowerId: null,
                },
            ]);

        const tauntBoost = await Boost.create({
            internalLabel: "Défenseur d'Argus - Provocation",
            attack: null,
            health: null,
            spellPower: null,
            minionPowerId: tauntPower.id,
        });

        const allyMinionsTarget = await Target.create({
            internalLabel: "Serviteurs alliés (masse)",
            type: "MINION",
            targetTeam: "PLAYER",
            comparisonId: null,
            tagId: null,
        });

        const otherMurlocsTarget = await Target.create({
            internalLabel: "Autres murlocs alliés",
            type: "MINION",
            targetTeam: "PLAYER",
            comparisonId: null,
            tagId: murlocTag.id,
            excludeSelf: true,
        });

        const [
            voyantLuminescentBoostAction,
            defenseurArgusBoostAction,
            defenseurArgusTauntAction,
            nainSombreferBoostAction,
            mageAncientSpellPowerAction,
            sergentAbusifBoostAction,
        ] = await Action.createMany([
            {
                internalLabel: "Voyant luminescent - +2 PV autres murlocs",
                type: "BOOST",
                isTargeted: false,
                ...nullActionFields,
                boostId: boostPlusTwoHealth.id,
            },
            {
                internalLabel: "Défenseur d'Argus - +1/+1 alliés",
                type: "BOOST",
                isTargeted: false,
                ...nullActionFields,
                boostId: boostPlusOneTaunt.id,
            },
            {
                internalLabel: "Défenseur d'Argus - Provocation alliés",
                type: "BOOST",
                isTargeted: false,
                ...nullActionFields,
                boostId: tauntBoost.id,
            },
            {
                internalLabel: "Nain de Sombrefer - +2 attaque ciblé",
                type: "BOOST",
                isTargeted: true,
                ...nullActionFields,
                boostId: boostPlusTwoAttack.id,
            },
            {
                internalLabel: "Mage ancien - +2 dégâts de sort héros",
                type: "BOOST",
                isTargeted: false,
                ...nullActionFields,
                boostId: boostSpellPower.id,
            },
            {
                internalLabel: "Sergent abusif - +2 attaque ciblé",
                type: "BOOST",
                isTargeted: true,
                ...nullActionFields,
                boostId: boostPlusTwoAttack.id,
            },
        ]);

        const [voyantLuminescent, defenseurArgus, nainSombrefer, mageAncient, sergentAbusif] =
            await Minion.createMany([
                { internalLabel: "Voyant luminescent", attack: 2, health: 3 },
                { internalLabel: "Défenseur d'Argus", attack: 2, health: 3 },
                { internalLabel: "Nain de Sombrefer", attack: 4, health: 4 },
                { internalLabel: "Mage ancien", attack: 2, health: 5 },
                { internalLabel: "Sergent abusif", attack: 2, health: 1 },
            ]);

        await ToolToTarget.createMany([
            {
                targetId: otherMurlocsTarget.id,
                actionId: voyantLuminescentBoostAction.id,
                boostId: null,
            },
            {
                targetId: allyMinionsTarget.id,
                actionId: defenseurArgusBoostAction.id,
                boostId: null,
            },
            {
                targetId: allyMinionsTarget.id,
                actionId: defenseurArgusTauntAction.id,
                boostId: null,
            },
            {
                targetId: targetedAllyMinionTarget.id,
                actionId: nainSombreferBoostAction.id,
                boostId: null,
            },
            {
                targetId: allyHeroTarget.id,
                actionId: mageAncientSpellPowerAction.id,
                boostId: null,
            },
            {
                targetId: targetedEnemyMinionTarget.id,
                actionId: sergentAbusifBoostAction.id,
                boostId: null,
            },
        ]);

        await MinionBattlecryAction.createMany([
            { minionId: voyantLuminescent.id, actionId: voyantLuminescentBoostAction.id },
            { minionId: defenseurArgus.id, actionId: defenseurArgusBoostAction.id },
            { minionId: defenseurArgus.id, actionId: defenseurArgusTauntAction.id },
            { minionId: nainSombrefer.id, actionId: nainSombreferBoostAction.id },
            { minionId: mageAncient.id, actionId: mageAncientSpellPowerAction.id },
            { minionId: sergentAbusif.id, actionId: sergentAbusifBoostAction.id },
        ]);

        const boostCards = await Card.createMany([
            {
                label: "Voyant luminescent",
                imageUrl: getClassicCardImage("Voyant luminescent"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: voyantLuminescent.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Défenseur d'Argus",
                imageUrl: getClassicCardImage("Défenseur d'Argus"),
                cost: 4,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: defenseurArgus.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Nain de Sombrefer",
                imageUrl: getClassicCardImage("Nain de Sombrefer"),
                cost: 4,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: nainSombrefer.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Mage ancien",
                imageUrl: getClassicCardImage("Mage ancien"),
                cost: 4,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: mageAncient.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Sergent abusif",
                imageUrl: getClassicCardImage("Sergent abusif"),
                cost: 1,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: sergentAbusif.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        await CardTag.create({ cardId: boostCards[0].id, tagId: murlocTag.id });

        const costOneComparison = await Comparison.create({
            costComparison: "=",
            cost: 1,
            attackComparison: null,
            attack: null,
            healthComparison: null,
            health: null,
        });

        const [costOneDrawFilter, beastDrawFilter, enemyCostOneDrawFilter] =
            await CardFilter.createMany([
                {
                    internalLabel: "Pioche un monstre coût 1",
                    type: "MINION",
                    comparisonId: costOneComparison.id,
                },
                {
                    internalLabel: "Pioche une bête",
                    type: "MINION",
                    comparisonId: null,
                },
                {
                    internalLabel: "Pioche adverse un monstre coût 1",
                    type: "MINION",
                    comparisonId: costOneComparison.id,
                },
            ]);

        await beastDrawFilter.related("tags").attach([beastTag.id]);

        const [filteredDrawAction, filteredBeastDrawAction, filteredEnemyDrawAction] =
            await Action.createMany([
                {
                    internalLabel: "Drake du Crépuscule - Pioche coût 1",
                    type: "DRAW",
                    isTargeted: false,
                    ...nullActionFields,
                    drawCount: 1,
                    drawCardFilterId: costOneDrawFilter.id,
                },
                {
                    internalLabel: "Maître-naturaliste - Pioche bête",
                    type: "DRAW",
                    isTargeted: false,
                    ...nullActionFields,
                    drawCount: 1,
                    drawCardFilterId: beastDrawFilter.id,
                },
                {
                    internalLabel: "Espion luminescent - Pioche adverse coût 1",
                    type: "ENEMY_DRAW",
                    isTargeted: false,
                    ...nullActionFields,
                    enemyDrawCount: 1,
                    enemyDrawCardFilterId: enemyCostOneDrawFilter.id,
                },
            ]);

        const [drakeCrepuscule, maitreNaturaliste, espionLuminescent, tigreStrangleronce] =
            await Minion.createMany([
                { internalLabel: "Drake du Crépuscule", attack: 4, health: 1 },
                { internalLabel: "Maître-naturaliste", attack: 2, health: 2 },
                { internalLabel: "Espion luminescent", attack: 2, health: 2 },
                { internalLabel: "Tigre de Strangleronce", attack: 5, health: 5 },
            ]);

        const [, , , tigreCard] = await Card.createMany([
            {
                label: "Drake du Crépuscule",
                imageUrl: getClassicCardImage("Drake du Crépuscule"),
                cost: 4,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: drakeCrepuscule.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Maître-naturaliste",
                imageUrl: getClassicCardImage("Maître-naturaliste"),
                cost: 2,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: maitreNaturaliste.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Espion luminescent",
                imageUrl: getClassicCardImage("Espion luminescent"),
                cost: 2,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: espionLuminescent.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Tigre de Strangleronce",
                imageUrl: getClassicCardImage("Tigre de Strangleronce"),
                cost: 5,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: tigreStrangleronce.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        await CardTag.createMany([
            { cardId: tigreCard.id, tagId: beastTag.id },
            {
                cardId: (await Card.query().where("label", "Espion luminescent").firstOrFail()).id,
                tagId: murlocTag.id,
            },
        ]);

        await MinionBattlecryAction.createMany([
            { minionId: drakeCrepuscule.id, actionId: filteredDrawAction.id },
            { minionId: maitreNaturaliste.id, actionId: filteredBeastDrawAction.id },
            { minionId: espionLuminescent.id, actionId: filteredEnemyDrawAction.id },
        ]);
    }
}
