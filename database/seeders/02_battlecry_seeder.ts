import Action from "#models/action";
import Boost from "#models/boost";
import Card from "#models/card";
import CardTag from "#models/card_tag";
import Comparison from "#models/comparison";
import Minion from "#models/minion";
import MinionBattlecryAction from "#models/minion_battlecry_action";
import MinionPower from "#models/minion_power";
import Tag from "#models/tag";
import Target from "#models/target";
import ToolToTarget from "#models/tool_to_target";
import { BaseSeeder } from "@adonisjs/lucid/seeders";

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
        const [damageAction, healAction, drawAction, enemyDrawAction] = await Action.createMany([
            {
                internalLabel: "Battlecry - 2 dégâts au héros adverse",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 2,
            },
            {
                internalLabel: "Battlecry - 3 soins au héros allié",
                type: "HEAL",
                isTargeted: false,
                ...nullActionFields,
                heal: 3,
            },
            {
                internalLabel: "Battlecry - Pioche 1 carte",
                type: "DRAW",
                isTargeted: false,
                ...nullActionFields,
                drawCount: 1,
            },
            {
                internalLabel: "Battlecry - L'adversaire pioche 1 carte",
                type: "ENEMY_DRAW",
                isTargeted: false,
                ...nullActionFields,
                enemyDrawCount: 1,
            },
        ]);

        const [minionDamage, minionHeal, minionDraw, minionEnemyDraw] = await Minion.createMany([
            {
                internalLabel: "Monstre 2-1 BC Dégâts",
                attack: 2,
                health: 1,
            },
            {
                internalLabel: "Monstre 2-1 BC Soins",
                attack: 2,
                health: 1,
            },
            {
                internalLabel: "Monstre 2-1 BC Pioche",
                attack: 2,
                health: 1,
            },
            {
                internalLabel: "Monstre 2-1 BC Pioche adverse",
                attack: 2,
                health: 1,
            },
        ]);

        await Card.createMany([
            {
                label: "Monster 2-1 Battlecry Damage",
                imageUrl: "https://picsum.photos/seed/monster_bc_damage/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: minionDamage.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-1 Battlecry Heal",
                imageUrl: "https://picsum.photos/seed/monster_bc_heal/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: minionHeal.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-1 Battlecry Draw",
                imageUrl: "https://picsum.photos/seed/monster_bc_draw/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: minionDraw.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-1 Battlecry Enemy Draw",
                imageUrl: "https://picsum.photos/seed/monster_bc_enemy_draw/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: minionEnemyDraw.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        const [enemyHeroTarget, allyHeroTarget] = await Target.createMany([
            {
                internalLabel: "Héros adverse",
                type: "HERO",
                targetTeam: "OPPONENT",
                comparisonId: null,
                tagId: null,
            },
            {
                internalLabel: "Héros allié",
                type: "HERO",
                targetTeam: "PLAYER",
                comparisonId: null,
                tagId: null,
            },
        ]);

        await ToolToTarget.createMany([
            { targetId: enemyHeroTarget.id, actionId: damageAction.id, boostId: null },
            { targetId: allyHeroTarget.id, actionId: healAction.id, boostId: null },
        ]);

        await MinionBattlecryAction.createMany([
            { minionId: minionDamage.id, actionId: damageAction.id },
            { minionId: minionHeal.id, actionId: healAction.id },
            { minionId: minionDraw.id, actionId: drawAction.id },
            { minionId: minionEnemyDraw.id, actionId: enemyDrawAction.id },
        ]);

        const [
            targetedHeroDamageAction,
            targetedMinionDamageAction,
            targetedMinionHealAction,
            targetedStrongMinionDamageAction,
            targetedBeastDamageAction,
            targetedLowHealthDamageAction,
            targetedExpensiveMinionDamageAction,
        ] = await Action.createMany([
            {
                internalLabel: "Battlecry ciblé - 3 dégâts au héros adverse",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 3,
            },
            {
                internalLabel: "Battlecry ciblé - 3 dégâts à un serviteur adverse",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 3,
            },
            {
                internalLabel: "Battlecry ciblé - 2 soins à un serviteur allié",
                type: "HEAL",
                isTargeted: true,
                ...nullActionFields,
                heal: 2,
            },
            {
                internalLabel: "Battlecry ciblé - 4 dégâts serviteur adverse attaque > 2",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 4,
            },
            {
                internalLabel: "Battlecry ciblé - 2 dégâts à une bête adverse",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 2,
            },
            {
                internalLabel: "Battlecry ciblé - 3 dégâts serviteur adverse pv < 4",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 3,
            },
            {
                internalLabel: "Battlecry ciblé - 3 dégâts serviteur adverse coût = 4",
                type: "DAMAGE",
                isTargeted: true,
                ...nullActionFields,
                damage: 3,
            },
        ]);

        const strongMinionComparison = await Comparison.create({
            costComparison: null,
            cost: null,
            attackComparison: ">",
            attack: 2,
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

        const beastTag = await Tag.create({
            name: "beast",
            symbol: "🦁",
            label: "Bête",
        });

        const [
            targetedHeroDamageMinion,
            targetedMinionDamageMinion,
            targetedMinionHealMinion,
            targetedStrongMinionDamageMinion,
            targetedBeastDamageMinion,
            targetedLowHealthDamageMinion,
            targetedExpensiveMinionDamageMinion,
        ] = await Minion.createMany([
            {
                internalLabel: "Monstre 2-2 BC Ciblé Héros",
                attack: 2,
                health: 2,
            },
            {
                internalLabel: "Monstre 2-2 BC Ciblé Serviteur",
                attack: 2,
                health: 2,
            },
            {
                internalLabel: "Monstre 1-3 BC Ciblé Soins",
                attack: 1,
                health: 3,
            },
            {
                internalLabel: "Monstre 3-2 BC Ciblé Fort",
                attack: 3,
                health: 2,
            },
            {
                internalLabel: "Monstre 2-2 BC Ciblé Bête",
                attack: 2,
                health: 2,
            },
            {
                internalLabel: "Monstre 2-3 BC Ciblé Faible",
                attack: 2,
                health: 3,
            },
            {
                internalLabel: "Monstre 3-1 BC Ciblé Cher",
                attack: 3,
                health: 1,
            },
        ]);

        await Card.createMany([
            {
                label: "Monster 2-2 Targeted Hero Damage",
                imageUrl: "https://picsum.photos/seed/monster_targeted_hero/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedHeroDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-2 Targeted Minion Damage",
                imageUrl: "https://picsum.photos/seed/monster_targeted_minion/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedMinionDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 1-3 Targeted Minion Heal",
                imageUrl: "https://picsum.photos/seed/monster_targeted_heal/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedMinionHealMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 3-2 Targeted Strong Minion",
                imageUrl: "https://picsum.photos/seed/monster_targeted_strong/200/300",
                cost: 4,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedStrongMinionDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-2 Targeted Beast Damage",
                imageUrl: "https://picsum.photos/seed/monster_targeted_beast/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedBeastDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-3 Targeted Low Health",
                imageUrl: "https://picsum.photos/seed/monster_targeted_low_health/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedLowHealthDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 3-1 Targeted Expensive",
                imageUrl: "https://picsum.photos/seed/monster_targeted_expensive/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedExpensiveMinionDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        const [
            targetedEnemyHeroTarget,
            targetedEnemyMinionTarget,
            targetedAllyMinionTarget,
            targetedStrongEnemyMinionTarget,
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
                internalLabel: "Serviteur adverse attaque > 2 (ciblé)",
                type: "MINION",
                targetTeam: "OPPONENT",
                comparisonId: strongMinionComparison.id,
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
            {
                targetId: targetedStrongEnemyMinionTarget.id,
                actionId: targetedStrongMinionDamageAction.id,
                boostId: null,
            },
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
            { minionId: targetedHeroDamageMinion.id, actionId: targetedHeroDamageAction.id },
            { minionId: targetedMinionDamageMinion.id, actionId: targetedMinionDamageAction.id },
            { minionId: targetedMinionHealMinion.id, actionId: targetedMinionHealAction.id },
            {
                minionId: targetedStrongMinionDamageMinion.id,
                actionId: targetedStrongMinionDamageAction.id,
            },
            { minionId: targetedBeastDamageMinion.id, actionId: targetedBeastDamageAction.id },
            {
                minionId: targetedLowHealthDamageMinion.id,
                actionId: targetedLowHealthDamageAction.id,
            },
            {
                minionId: targetedExpensiveMinionDamageMinion.id,
                actionId: targetedExpensiveMinionDamageAction.id,
            },
        ]);

        const tauntCard = await Card.query().where("label", "Monster 1-2").first();
        const strongCard = await Card.query().where("label", "Monster 3-1").first();

        if (tauntCard) {
            await CardTag.create({ cardId: tauntCard.id, tagId: beastTag.id });
        }
        if (strongCard) {
            await CardTag.create({ cardId: strongCard.id, tagId: beastTag.id });
        }

        const tauntPower = await MinionPower.query().where("hasTaunt", true).firstOrFail();

        const [boostPlusTwo, boostPlusOne, boostSpellPower, boostTaunt] = await Boost.createMany([
            {
                internalLabel: "Battlecry - +2/+2",
                attack: 2,
                health: 2,
                spellPower: null,
                minionPowerId: null,
            },
            {
                internalLabel: "Battlecry - +1/+1",
                attack: 1,
                health: 1,
                spellPower: null,
                minionPowerId: null,
            },
            {
                internalLabel: "Battlecry - +2 dégâts de sort",
                attack: null,
                health: null,
                spellPower: 2,
                minionPowerId: null,
            },
            {
                internalLabel: "Battlecry - Provocation",
                attack: null,
                health: null,
                spellPower: null,
                minionPowerId: tauntPower.id,
            },
        ]);

        const allyMinionsTarget = await Target.create({
            internalLabel: "Serviteurs alliés (masse)",
            type: "MINION",
            targetTeam: "PLAYER",
            comparisonId: null,
            tagId: null,
        });

        const [
            targetedAllyBoostAction,
            massAllyBoostAction,
            heroSpellPowerBoostAction,
            targetedTauntBoostAction,
            targetedEnemyBoostAction,
        ] = await Action.createMany([
            {
                internalLabel: "Battlecry - +2/+2 à un serviteur allié",
                type: "BOOST",
                isTargeted: true,
                ...nullActionFields,
                boostId: boostPlusTwo.id,
            },
            {
                internalLabel: "Battlecry - +1/+1 à vos serviteurs",
                type: "BOOST",
                isTargeted: false,
                ...nullActionFields,
                boostId: boostPlusOne.id,
            },
            {
                internalLabel: "Battlecry - +2 dégâts de sort au héros allié",
                type: "BOOST",
                isTargeted: false,
                ...nullActionFields,
                boostId: boostSpellPower.id,
            },
            {
                internalLabel: "Battlecry - Provocation à un serviteur allié",
                type: "BOOST",
                isTargeted: true,
                ...nullActionFields,
                boostId: boostTaunt.id,
            },
            {
                internalLabel: "Battlecry - +1/+1 à un serviteur adverse",
                type: "BOOST",
                isTargeted: true,
                ...nullActionFields,
                boostId: boostPlusOne.id,
            },
        ]);

        const [
            targetedAllyBoostMinion,
            massAllyBoostMinion,
            heroSpellPowerBoostMinion,
            targetedTauntBoostMinion,
            targetedEnemyBoostMinion,
        ] = await Minion.createMany([
            {
                internalLabel: "Monstre 3-2 BC Boost allié ciblé",
                attack: 3,
                health: 2,
            },
            {
                internalLabel: "Monstre 2-3 BC Boost masse allié",
                attack: 2,
                health: 3,
            },
            {
                internalLabel: "Monstre 2-2 BC Boost spell power",
                attack: 2,
                health: 2,
            },
            {
                internalLabel: "Monstre 2-2 BC Boost provocation",
                attack: 2,
                health: 2,
            },
            {
                internalLabel: "Monstre 2-1 BC Boost adverse ciblé",
                attack: 2,
                health: 1,
            },
        ]);

        await Card.createMany([
            {
                label: "Monster 3-2 Targeted Ally Boost",
                imageUrl: "https://picsum.photos/seed/monster_targeted_ally_boost/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedAllyBoostMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-3 Mass Ally Boost",
                imageUrl: "https://picsum.photos/seed/monster_mass_ally_boost/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: massAllyBoostMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-2 Hero Spell Power Boost",
                imageUrl: "https://picsum.photos/seed/monster_hero_spell_power_boost/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: heroSpellPowerBoostMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-2 Grant Taunt Boost",
                imageUrl: "https://picsum.photos/seed/monster_grant_taunt_boost/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedTauntBoostMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-1 Targeted Enemy Boost",
                imageUrl: "https://picsum.photos/seed/monster_targeted_enemy_boost/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: targetedEnemyBoostMinion.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        await ToolToTarget.createMany([
            {
                targetId: targetedAllyMinionTarget.id,
                actionId: targetedAllyBoostAction.id,
                boostId: null,
            },
            {
                targetId: allyMinionsTarget.id,
                actionId: massAllyBoostAction.id,
                boostId: null,
            },
            {
                targetId: allyHeroTarget.id,
                actionId: heroSpellPowerBoostAction.id,
                boostId: null,
            },
            {
                targetId: targetedAllyMinionTarget.id,
                actionId: targetedTauntBoostAction.id,
                boostId: null,
            },
            {
                targetId: targetedEnemyMinionTarget.id,
                actionId: targetedEnemyBoostAction.id,
                boostId: null,
            },
        ]);

        await MinionBattlecryAction.createMany([
            { minionId: targetedAllyBoostMinion.id, actionId: targetedAllyBoostAction.id },
            { minionId: massAllyBoostMinion.id, actionId: massAllyBoostAction.id },
            { minionId: heroSpellPowerBoostMinion.id, actionId: heroSpellPowerBoostAction.id },
            { minionId: targetedTauntBoostMinion.id, actionId: targetedTauntBoostAction.id },
            { minionId: targetedEnemyBoostMinion.id, actionId: targetedEnemyBoostAction.id },
        ]);
    }
}
