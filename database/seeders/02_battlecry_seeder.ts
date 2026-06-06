import Action from "#models/action";
import Card from "#models/card";
import Minion from "#models/minion";
import MinionBattlecryAction from "#models/minion_battlecry_action";
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

        await MinionBattlecryAction.createMany([
            { minionId: minionDamage.id, actionId: damageAction.id },
            { minionId: minionHeal.id, actionId: healAction.id },
            { minionId: minionDraw.id, actionId: drawAction.id },
            { minionId: minionEnemyDraw.id, actionId: enemyDrawAction.id },
        ]);
    }
}
