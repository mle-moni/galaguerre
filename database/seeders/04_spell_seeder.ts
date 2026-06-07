import Action from "#models/action";
import Boost from "#models/boost";
import Card from "#models/card";
import Spell from "#models/spell";
import Target from "#models/target";
import ToolToTarget from "#models/tool_to_target";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
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
        const [barrelDamageAction, stompDamageAction, hoggerDamageAction, salveDamageAction] =
            await Action.createMany([
                {
                    internalLabel: "Lance-tonneau - 2 dégâts au héros adverse",
                    type: "DAMAGE",
                    isTargeted: false,
                    ...nullActionFields,
                    damage: 2,
                },
                {
                    internalLabel: "Piétinement - 2 dégâts à tous les ennemis",
                    type: "DAMAGE",
                    isTargeted: false,
                    ...nullActionFields,
                    damage: 2,
                },
                {
                    internalLabel: "Hogger Frappe ! - 4 dégâts au héros adverse",
                    type: "DAMAGE",
                    isTargeted: false,
                    ...nullActionFields,
                    damage: 4,
                },
                {
                    internalLabel: "Salve ardente - 1 dégât aléatoire",
                    type: "DAMAGE",
                    isTargeted: false,
                    ...nullActionFields,
                    damage: 1,
                },
            ]);

        const massBoost = await Boost.create({
            internalLabel: "Héritage de l'Empereur - +2/+2",
            attack: 2,
            health: 2,
            spellPower: null,
            minionPowerId: null,
        });

        const heritageBoostAction = await Action.create({
            internalLabel: "Héritage de l'Empereur - +2/+2 alliés",
            type: "BOOST",
            isTargeted: false,
            ...nullActionFields,
            boostId: massBoost.id,
        });

        const [enemyHeroTarget, allEnemiesTarget, allyMinionsTarget, randomEnemyTarget] =
            await Target.createMany([
                {
                    internalLabel: "Héros adverse",
                    type: "HERO",
                    targetTeam: "OPPONENT",
                    comparisonId: null,
                    tagId: null,
                },
                {
                    internalLabel: "Tous les ennemis",
                    type: "ALL",
                    targetTeam: "OPPONENT",
                    comparisonId: null,
                    tagId: null,
                },
                {
                    internalLabel: "Serviteurs alliés",
                    type: "MINION",
                    targetTeam: "PLAYER",
                    comparisonId: null,
                    tagId: null,
                },
                {
                    internalLabel: "Cibles ennemies aléatoires",
                    type: "ALL",
                    targetTeam: "OPPONENT",
                    comparisonId: null,
                    tagId: null,
                    maxTargets: 5,
                    targetSelectionMode: "RANDOM",
                },
            ]);

        await ToolToTarget.createMany([
            { targetId: enemyHeroTarget.id, actionId: barrelDamageAction.id, boostId: null },
            { targetId: allEnemiesTarget.id, actionId: stompDamageAction.id, boostId: null },
            { targetId: enemyHeroTarget.id, actionId: hoggerDamageAction.id, boostId: null },
            { targetId: randomEnemyTarget.id, actionId: salveDamageAction.id, boostId: null },
            { targetId: allyMinionsTarget.id, actionId: heritageBoostAction.id, boostId: null },
        ]);

        const [lanceTonneauSpell, pietinementSpell, hoggerSpell, heritageSpell, salveArdenteSpell] =
            await Spell.createMany([
                { internalLabel: "Lance-tonneau", actionId: barrelDamageAction.id },
                { internalLabel: "Piétinement", actionId: stompDamageAction.id },
                { internalLabel: "Hogger Frappe !", actionId: hoggerDamageAction.id },
                { internalLabel: "Héritage de l'Empereur", actionId: heritageBoostAction.id },
                { internalLabel: "Salve ardente", actionId: salveDamageAction.id },
            ]);

        await Card.createMany([
            {
                label: "Lance-tonneau",
                imageUrl: getClassicCardImage("Lance-tonneau"),
                cost: 1,
                type: "SPELL",
                cardMode: "BETA",
                minionId: null,
                spellId: lanceTonneauSpell.id,
                weaponId: null,
            },
            {
                label: "Piétinement",
                imageUrl: getClassicCardImage("Piétinement"),
                cost: 2,
                type: "SPELL",
                cardMode: "BETA",
                minionId: null,
                spellId: pietinementSpell.id,
                weaponId: null,
            },
            {
                label: "Hogger Frappe !",
                imageUrl: getClassicCardImage("Hogger Frappe !"),
                cost: 4,
                type: "SPELL",
                cardMode: "BETA",
                minionId: null,
                spellId: hoggerSpell.id,
                weaponId: null,
            },
            {
                label: "Héritage de l'Empereur",
                imageUrl: getClassicCardImage("Héritage de l'Empereur"),
                cost: 3,
                type: "SPELL",
                cardMode: "BETA",
                minionId: null,
                spellId: heritageSpell.id,
                weaponId: null,
            },
            {
                label: "Salve ardente",
                imageUrl: getClassicCardImage("Salve ardente"),
                cost: 3,
                type: "SPELL",
                cardMode: "BETA",
                minionId: null,
                spellId: salveArdenteSpell.id,
                weaponId: null,
            },
        ]);
    }
}
