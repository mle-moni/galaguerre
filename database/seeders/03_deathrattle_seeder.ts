import Action from "#models/action";
import Card from "#models/card";
import Minion from "#models/minion";
import MinionDeathrattleAction from "#models/minion_deathrattle_action";
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
        const [damageAction, healAction, drawAction, enemyDrawAction, massMinionDamageAction] =
            await Action.createMany([
                {
                    internalLabel: "Deathrattle - 2 dégâts au héros adverse",
                    type: "DAMAGE",
                    isTargeted: false,
                    ...nullActionFields,
                    damage: 2,
                },
                {
                    internalLabel: "Deathrattle - 3 soins au héros allié",
                    type: "HEAL",
                    isTargeted: false,
                    ...nullActionFields,
                    heal: 3,
                },
                {
                    internalLabel: "Deathrattle - Pioche 1 carte",
                    type: "DRAW",
                    isTargeted: false,
                    ...nullActionFields,
                    drawCount: 1,
                },
                {
                    internalLabel: "Deathrattle - L'adversaire pioche 1 carte",
                    type: "ENEMY_DRAW",
                    isTargeted: false,
                    ...nullActionFields,
                    enemyDrawCount: 1,
                },
                {
                    internalLabel: "Deathrattle - 1 dégât à tous les serviteurs adverses",
                    type: "DAMAGE",
                    isTargeted: false,
                    ...nullActionFields,
                    damage: 1,
                },
            ]);

        const [minionDamage, minionHeal, minionDraw, minionEnemyDraw, minionMassDamage] =
            await Minion.createMany([
                {
                    internalLabel: "Monstre 2-1 DR Dégâts",
                    attack: 2,
                    health: 1,
                },
                {
                    internalLabel: "Monstre 2-1 DR Soins",
                    attack: 2,
                    health: 1,
                },
                {
                    internalLabel: "Monstre 2-1 DR Pioche",
                    attack: 2,
                    health: 1,
                },
                {
                    internalLabel: "Monstre 2-1 DR Pioche adverse",
                    attack: 2,
                    health: 1,
                },
                {
                    internalLabel: "Monstre 2-1 DR Dégâts de masse",
                    attack: 2,
                    health: 1,
                },
            ]);

        await Card.createMany([
            {
                label: "Monster 2-1 Deathrattle Damage",
                imageUrl: "https://picsum.photos/seed/monster_dr_damage/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: minionDamage.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-1 Deathrattle Heal",
                imageUrl: "https://picsum.photos/seed/monster_dr_heal/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: minionHeal.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-1 Deathrattle Draw",
                imageUrl: "https://picsum.photos/seed/monster_dr_draw/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: minionDraw.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-1 Deathrattle Enemy Draw",
                imageUrl: "https://picsum.photos/seed/monster_dr_enemy_draw/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: minionEnemyDraw.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Monster 2-1 Deathrattle Mass Damage",
                imageUrl: "https://picsum.photos/seed/monster_dr_mass_damage/200/300",
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: minionMassDamage.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        const [enemyHeroTarget, allyHeroTarget, enemyMinionTarget] = await Target.createMany([
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
            {
                internalLabel: "Tous les serviteurs adverses",
                type: "MINION",
                targetTeam: "OPPONENT",
                comparisonId: null,
                tagId: null,
            },
        ]);

        await ToolToTarget.createMany([
            { targetId: enemyHeroTarget.id, actionId: damageAction.id, boostId: null },
            { targetId: allyHeroTarget.id, actionId: healAction.id, boostId: null },
            { targetId: enemyMinionTarget.id, actionId: massMinionDamageAction.id, boostId: null },
        ]);

        await MinionDeathrattleAction.createMany([
            { minionId: minionDamage.id, actionId: damageAction.id },
            { minionId: minionHeal.id, actionId: healAction.id },
            { minionId: minionDraw.id, actionId: drawAction.id },
            { minionId: minionEnemyDraw.id, actionId: enemyDrawAction.id },
            { minionId: minionMassDamage.id, actionId: massMinionDamageAction.id },
        ]);
    }
}
