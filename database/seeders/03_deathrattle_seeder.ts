import Action from "#models/action";
import Boost from "#models/boost";
import Card from "#models/card";
import Minion from "#models/minion";
import MinionDeathrattleAction from "#models/minion_deathrattle_action";
import MinionPassive from "#models/minon_passive";
import MinionPower from "#models/minion_power";
import Passive from "#models/passive";
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
        const tauntPower = await MinionPower.query().where("hasTaunt", true).firstOrFail();

        const [
            heroDamageAction,
            drawAction,
            allDamageAction,
            allyHeroHealAction,
            enemyMassDamageAction,
        ] = await Action.createMany([
            {
                internalLabel: "Gnome lépreux - 2 dégâts au héros adverse",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 2,
            },
            {
                internalLabel: "Glaneur de butin - Pioche 1 carte",
                type: "DRAW",
                isTargeted: false,
                ...nullActionFields,
                drawCount: 1,
            },
            {
                internalLabel: "Abomination - 2 dégâts à tous",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 2,
            },
            {
                internalLabel: "Spectre apaisant - 3 soins au héros allié",
                type: "HEAL",
                isTargeted: false,
                ...nullActionFields,
                heal: 3,
            },
            {
                internalLabel: "Râle - 1 dégât aux serviteurs adverses",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 1,
            },
        ]);

        const [enemyHeroTarget, allCharactersTarget, allyHeroTarget, enemyMinionsTarget] =
            await Target.createMany([
                {
                    internalLabel: "Héros adverse",
                    type: "HERO",
                    targetTeam: "OPPONENT",
                    comparisonId: null,
                    tagId: null,
                },
                {
                    internalLabel: "Tous les personnages",
                    type: "ALL",
                    targetTeam: "ALL",
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
                    internalLabel: "Serviteurs adverses",
                    type: "MINION",
                    targetTeam: "OPPONENT",
                    comparisonId: null,
                    tagId: null,
                },
            ]);

        await ToolToTarget.createMany([
            { targetId: enemyHeroTarget.id, actionId: heroDamageAction.id, boostId: null },
            { targetId: allCharactersTarget.id, actionId: allDamageAction.id, boostId: null },
            { targetId: allyHeroTarget.id, actionId: allyHeroHealAction.id, boostId: null },
            { targetId: enemyMinionsTarget.id, actionId: enemyMassDamageAction.id, boostId: null },
        ]);

        const spellPowerBoost = await Boost.create({
            internalLabel: "Thalnos - +1 dégât de sort",
            attack: null,
            health: null,
            spellPower: 1,
            minionPowerId: null,
        });

        await ToolToTarget.create({
            targetId: allyHeroTarget.id,
            actionId: null,
            boostId: spellPowerBoost.id,
        });

        const thalnosSpellPowerPassive = await Passive.create({
            internalLabel: "Thalnos - aura spell power",
            type: "BOOST",
            triggersOn: null,
            actionId: null,
            boostId: spellPowerBoost.id,
        });

        const [gnomeLepreux, glaneurButin, abomination, mageSangThalnos, spectreApaisant] =
            await Minion.createMany([
                { internalLabel: "Gnome lépreux", attack: 2, health: 1 },
                { internalLabel: "Glaneur de butin", attack: 2, health: 1 },
                {
                    internalLabel: "Abomination",
                    attack: 4,
                    health: 4,
                    minionPowerId: tauntPower.id,
                },
                { internalLabel: "Mage de sang Thalnos", attack: 1, health: 1 },
                { internalLabel: "Spectre apaisant", attack: 2, health: 1 },
            ]);

        await MinionDeathrattleAction.createMany([
            { minionId: gnomeLepreux.id, actionId: heroDamageAction.id },
            { minionId: glaneurButin.id, actionId: drawAction.id },
            { minionId: abomination.id, actionId: allDamageAction.id },
            { minionId: mageSangThalnos.id, actionId: drawAction.id },
            { minionId: spectreApaisant.id, actionId: allyHeroHealAction.id },
        ]);

        await MinionPassive.create({
            minionId: mageSangThalnos.id,
            passiveId: thalnosSpellPowerPassive.id,
        });

        await Card.createMany([
            {
                label: "Gnome lépreux",
                imageUrl: getClassicCardImage("gnome_lepreux"),
                cost: 1,
                type: "MINION",
                cardMode: "BETA",
                minionId: gnomeLepreux.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Glaneur de butin",
                imageUrl: getClassicCardImage("glaneur_butin"),
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: glaneurButin.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Abomination",
                imageUrl: getClassicCardImage("abomination"),
                cost: 5,
                type: "MINION",
                cardMode: "BETA",
                minionId: abomination.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Mage de sang Thalnos",
                imageUrl: getClassicCardImage("mage_sang_thalnos"),
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: mageSangThalnos.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Spectre apaisant",
                imageUrl: getClassicCardImage("spectre_apaisant"),
                cost: 2,
                type: "MINION",
                cardMode: "BETA",
                minionId: spectreApaisant.id,
                spellId: null,
                weaponId: null,
            },
        ]);
    }
}
