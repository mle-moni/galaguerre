import Action from "#models/action";
import Card from "#models/card";
import Weapon from "#models/weapon";
import WeaponDeathrattleAction from "#models/weapon_deathrattle_action";
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
        const drawAction = await Action.create({
            internalLabel: "Arme DR - Pioche 1 carte",
            type: "DRAW",
            isTargeted: false,
            ...nullActionFields,
            drawCount: 1,
        });

        const [simpleWeapon, deathrattleWeapon] = await Weapon.createMany([
            {
                internalLabel: "Arme 3/2",
                damage: 3,
                durability: 2,
            },
            {
                internalLabel: "Arme 2/3 DR Pioche",
                damage: 2,
                durability: 3,
            },
        ]);

        await WeaponDeathrattleAction.create({
            weaponId: deathrattleWeapon.id,
            actionId: drawAction.id,
        });

        await Card.createMany([
            {
                label: "Weapon 2 - 3/2",
                imageUrl: "https://picsum.photos/seed/weapon_3-2/200/300",
                cost: 2,
                type: "WEAPON",
                cardMode: "BETA",
                minionId: null,
                spellId: null,
                weaponId: simpleWeapon.id,
            },
            {
                label: "Weapon 3 - 2/3 Deathrattle Draw",
                imageUrl: "https://picsum.photos/seed/weapon_dr_draw/200/300",
                cost: 3,
                type: "WEAPON",
                cardMode: "BETA",
                minionId: null,
                spellId: null,
                weaponId: deathrattleWeapon.id,
            },
        ]);
    }
}
