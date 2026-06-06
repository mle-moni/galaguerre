import Action from "#models/action";
import Boost from "#models/boost";
import Card from "#models/card";
import Minion from "#models/minion";
import MinionPassive from "#models/minon_passive";
import Passive from "#models/passive";
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
        const [enemyHeroTarget, allyHeroTarget, enemyMinionsTarget, allyMinionsTarget] =
            await Target.createMany([
                {
                    internalLabel: "Passif - Héros adverse",
                    type: "HERO",
                    targetTeam: "OPPONENT",
                    comparisonId: null,
                    tagId: null,
                },
                {
                    internalLabel: "Passif - Héros allié",
                    type: "HERO",
                    targetTeam: "PLAYER",
                    comparisonId: null,
                    tagId: null,
                },
                {
                    internalLabel: "Passif - Serviteurs adverses",
                    type: "MINION",
                    targetTeam: "OPPONENT",
                    comparisonId: null,
                    tagId: null,
                },
                {
                    internalLabel: "Passif - Autres serviteurs alliés",
                    type: "MINION",
                    targetTeam: "PLAYER",
                    comparisonId: null,
                    tagId: null,
                    excludeSelf: true,
                },
            ]);

        const [
            turnEndHeroDamageAction,
            turnEndMassMinionDamageAction,
            turnEndOtherAllyMinionDamageAction,
            turnBeginHeroHealAction,
            drawPassiveAction,
            healReactiveDamageAction,
        ] = await Action.createMany([
            {
                internalLabel: "Passif fin de tour - 1 dégât au héros adverse",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 1,
            },
            {
                internalLabel: "Passif fin de tour - 1 dégât aux serviteurs adverses",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 1,
            },
            {
                internalLabel: "Passif fin de tour - 1 dégât à vos autres serviteurs",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 1,
            },
            {
                internalLabel: "Passif début de tour - 2 soins au héros allié",
                type: "HEAL",
                isTargeted: false,
                ...nullActionFields,
                heal: 2,
            },
            {
                internalLabel: "Passif pioche - Pioche 1 carte",
                type: "DRAW",
                isTargeted: false,
                ...nullActionFields,
                drawCount: 1,
            },
            {
                internalLabel: "Passif soin - 1 dégât au héros adverse",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 1,
            },
        ]);

        await ToolToTarget.createMany([
            {
                targetId: enemyHeroTarget.id,
                actionId: turnEndHeroDamageAction.id,
                boostId: null,
            },
            {
                targetId: enemyMinionsTarget.id,
                actionId: turnEndMassMinionDamageAction.id,
                boostId: null,
            },
            {
                targetId: allyMinionsTarget.id,
                actionId: turnEndOtherAllyMinionDamageAction.id,
                boostId: null,
            },
            {
                targetId: allyHeroTarget.id,
                actionId: turnBeginHeroHealAction.id,
                boostId: null,
            },
            {
                targetId: enemyHeroTarget.id,
                actionId: healReactiveDamageAction.id,
                boostId: null,
            },
        ]);

        const [auraPlusOneBoost, auraSpellPowerBoost] = await Boost.createMany([
            {
                internalLabel: "Passif aura - +1/+1",
                attack: 1,
                health: 1,
                spellPower: null,
                minionPowerId: null,
            },
            {
                internalLabel: "Passif aura - +1 dégât de sort",
                attack: null,
                health: null,
                spellPower: 1,
                minionPowerId: null,
            },
        ]);

        await ToolToTarget.createMany([
            {
                targetId: allyMinionsTarget.id,
                actionId: null,
                boostId: auraPlusOneBoost.id,
            },
            {
                targetId: allyHeroTarget.id,
                actionId: null,
                boostId: auraSpellPowerBoost.id,
            },
        ]);

        const [
            turnEndHeroDamagePassive,
            turnEndMassMinionDamagePassive,
            turnEndOtherAllyMinionDamagePassive,
            turnBeginHeroHealPassive,
            drawPassive,
            healReactiveDamagePassive,
            auraPlusOnePassive,
            auraSpellPowerPassive,
        ] = await Passive.createMany([
            {
                internalLabel: "Passif fin de tour - dégâts héros",
                type: "ACTION",
                triggersOn: "TURN_END",
                actionId: turnEndHeroDamageAction.id,
                boostId: null,
            },
            {
                internalLabel: "Passif fin de tour - dégâts masse",
                type: "ACTION",
                triggersOn: "TURN_END",
                actionId: turnEndMassMinionDamageAction.id,
                boostId: null,
            },
            {
                internalLabel: "Passif fin de tour - dégâts autres alliés",
                type: "ACTION",
                triggersOn: "TURN_END",
                actionId: turnEndOtherAllyMinionDamageAction.id,
                boostId: null,
            },
            {
                internalLabel: "Passif début de tour - soins héros",
                type: "ACTION",
                triggersOn: "TURN_BEGIN",
                actionId: turnBeginHeroHealAction.id,
                boostId: null,
            },
            {
                internalLabel: "Passif pioche",
                type: "ACTION",
                triggersOn: "DRAW",
                actionId: drawPassiveAction.id,
                boostId: null,
            },
            {
                internalLabel: "Passif soin réactif",
                type: "ACTION",
                triggersOn: "HEAL",
                actionId: healReactiveDamageAction.id,
                boostId: null,
            },
            {
                internalLabel: "Passif aura +1/+1 alliés",
                type: "BOOST",
                triggersOn: null,
                actionId: null,
                boostId: auraPlusOneBoost.id,
            },
            {
                internalLabel: "Passif aura spell power",
                type: "BOOST",
                triggersOn: null,
                actionId: null,
                boostId: auraSpellPowerBoost.id,
            },
        ]);

        const [
            turnEndHeroDamageMinion,
            turnEndMassMinionDamageMinion,
            turnEndOtherAllyMinionDamageMinion,
            turnBeginHeroHealMinion,
            drawPassiveMinion,
            healReactiveDamageMinion,
            auraPlusOneMinion,
            auraSpellPowerMinion,
        ] = await Minion.createMany([
            {
                internalLabel: "Monstre 2-3 Passif fin de tour dégâts",
                attack: 2,
                health: 3,
            },
            {
                internalLabel: "Monstre 3-2 Passif fin de tour masse",
                attack: 3,
                health: 2,
            },
            {
                internalLabel: "Monstre 2-3 Passif fin de tour dégâts autres alliés",
                attack: 2,
                health: 3,
            },
            {
                internalLabel: "Monstre 2-4 Passif début de tour soins",
                attack: 2,
                health: 4,
            },
            {
                internalLabel: "Monstre 2-3 Passif pioche",
                attack: 2,
                health: 3,
            },
            {
                internalLabel: "Monstre 2-2 Passif soin réactif",
                attack: 2,
                health: 2,
            },
            {
                internalLabel: "Monstre 1-4 Passif aura +1/+1",
                attack: 1,
                health: 4,
            },
            {
                internalLabel: "Monstre 2-3 Passif aura spell power",
                attack: 2,
                health: 3,
            },
        ]);

        await MinionPassive.createMany([
            { minionId: turnEndHeroDamageMinion.id, passiveId: turnEndHeroDamagePassive.id },
            {
                minionId: turnEndMassMinionDamageMinion.id,
                passiveId: turnEndMassMinionDamagePassive.id,
            },
            {
                minionId: turnEndOtherAllyMinionDamageMinion.id,
                passiveId: turnEndOtherAllyMinionDamagePassive.id,
            },
            { minionId: turnBeginHeroHealMinion.id, passiveId: turnBeginHeroHealPassive.id },
            { minionId: drawPassiveMinion.id, passiveId: drawPassive.id },
            { minionId: healReactiveDamageMinion.id, passiveId: healReactiveDamagePassive.id },
            { minionId: auraPlusOneMinion.id, passiveId: auraPlusOnePassive.id },
            { minionId: auraSpellPowerMinion.id, passiveId: auraSpellPowerPassive.id },
        ]);

        await Card.createMany([
            {
                label: "Monster 2-3 Passive Turn End Damage",
                imageUrl: "https://picsum.photos/seed/passive_turn_end_damage/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: turnEndHeroDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 3-2 Passive Turn End Mass Damage",
                imageUrl: "https://picsum.photos/seed/passive_turn_end_mass/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: turnEndMassMinionDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-3 Passive Turn End Other Ally Damage",
                imageUrl: "https://picsum.photos/seed/passive_turn_end_other_allies/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: turnEndOtherAllyMinionDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-4 Passive Turn Begin Heal",
                imageUrl: "https://picsum.photos/seed/passive_turn_begin_heal/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: turnBeginHeroHealMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-3 Passive Draw",
                imageUrl: "https://picsum.photos/seed/passive_draw/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: drawPassiveMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-2 Passive Heal Reactive",
                imageUrl: "https://picsum.photos/seed/passive_heal_reactive/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: healReactiveDamageMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 1-4 Passive Aura +1/+1",
                imageUrl: "https://picsum.photos/seed/passive_aura_plus_one/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: auraPlusOneMinion.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-3 Passive Aura Spell Power",
                imageUrl: "https://picsum.photos/seed/passive_aura_spell_power/200/300",
                cost: 3,
                type: "MINION",
                cardMode: "BETA",
                minionId: auraSpellPowerMinion.id,
                spellId: null,
                weaponId: null,
            },
        ]);
    }
}
