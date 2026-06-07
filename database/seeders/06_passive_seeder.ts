import Action from "#models/action";
import Boost from "#models/boost";
import Card from "#models/card";
import CardSet from "#models/card_set";
import CardTag from "#models/card_tag";
import Minion from "#models/minion";
import MinionPassive from "#models/minon_passive";
import Passive from "#models/passive";
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

        const murlocTag = await Tag.query().where("name", "murloc").firstOrFail();
        const pirateTag = await Tag.query().where("name", "pirate").firstOrFail();

        const [
            allOtherCharactersTarget,
            randomEnemyTarget,
            enemyHeroTarget,
            randomEnemyMinionTarget,
            allyHeroTarget,
            otherMurlocsTarget,
            otherPiratesTarget,
        ] = await Target.createMany([
            {
                internalLabel: "Passif - Tous les autres personnages",
                type: "ALL",
                targetTeam: "ALL",
                comparisonId: null,
                tagId: null,
                excludeSelf: true,
            },
            {
                internalLabel: "Passif - Cible ennemi aléatoire",
                type: "ALL",
                targetTeam: "OPPONENT",
                comparisonId: null,
                tagId: null,
                maxTargets: 1,
                targetSelectionMode: "RANDOM",
            },
            {
                internalLabel: "Passif - Héros adverse",
                type: "HERO",
                targetTeam: "OPPONENT",
                comparisonId: null,
                tagId: null,
            },
            {
                internalLabel: "Passif - Serviteur adverse aléatoire",
                type: "MINION",
                targetTeam: "OPPONENT",
                comparisonId: null,
                tagId: null,
                maxTargets: 1,
                targetSelectionMode: "RANDOM",
            },
            {
                internalLabel: "Passif - Héros allié",
                type: "HERO",
                targetTeam: "PLAYER",
                comparisonId: null,
                tagId: null,
            },
            {
                internalLabel: "Passif - Autres murlocs alliés",
                type: "MINION",
                targetTeam: "PLAYER",
                comparisonId: null,
                tagId: murlocTag.id,
                excludeSelf: true,
            },
            {
                internalLabel: "Passif - Autres pirates alliés",
                type: "MINION",
                targetTeam: "PLAYER",
                comparisonId: null,
                tagId: pirateTag.id,
                excludeSelf: true,
            },
        ]);

        const [
            baronDamageAction,
            ragnarosDamageAction,
            lightwardenDamageAction,
            demolisherDamageAction,
            drawPassiveAction,
        ] = await Action.createMany([
            {
                internalLabel: "Baron Geddon - 2 dégâts fin de tour",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 2,
            },
            {
                internalLabel: "Ragnaros - 8 dégâts fin de tour",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 8,
            },
            {
                internalLabel: "Gardien de la Lumière - 2 dégâts réactifs",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 2,
            },
            {
                internalLabel: "Démolisseur - 2 dégâts début de tour",
                type: "DAMAGE",
                isTargeted: false,
                ...nullActionFields,
                damage: 2,
            },
            {
                internalLabel: "Commissaire-priseur - Pioche 1",
                type: "DRAW",
                isTargeted: false,
                ...nullActionFields,
                drawCount: 1,
            },
        ]);

        await ToolToTarget.createMany([
            {
                targetId: allOtherCharactersTarget.id,
                actionId: baronDamageAction.id,
                boostId: null,
            },
            { targetId: randomEnemyTarget.id, actionId: ragnarosDamageAction.id, boostId: null },
            { targetId: enemyHeroTarget.id, actionId: lightwardenDamageAction.id, boostId: null },
            {
                targetId: randomEnemyMinionTarget.id,
                actionId: demolisherDamageAction.id,
                boostId: null,
            },
        ]);

        const [murlocWarleaderBoost, southseaCaptainBoost, malygosSpellPowerBoost] =
            await Boost.createMany([
                {
                    internalLabel: "Chef de guerre murloc - +2 attaque",
                    attack: 2,
                    health: null,
                    spellPower: null,
                    minionPowerId: null,
                },
                {
                    internalLabel: "Capitaine des mers du Sud - +1/+1",
                    attack: 1,
                    health: 1,
                    spellPower: null,
                    minionPowerId: null,
                },
                {
                    internalLabel: "Malygos - +5 dégâts de sort",
                    attack: null,
                    health: null,
                    spellPower: 5,
                    minionPowerId: null,
                },
            ]);

        await ToolToTarget.createMany([
            { targetId: otherMurlocsTarget.id, actionId: null, boostId: murlocWarleaderBoost.id },
            { targetId: otherPiratesTarget.id, actionId: null, boostId: southseaCaptainBoost.id },
            { targetId: allyHeroTarget.id, actionId: null, boostId: malygosSpellPowerBoost.id },
        ]);

        const [
            baronPassive,
            ragnarosPassive,
            lightwardenPassive,
            demolisherPassive,
            auctioneerPassive,
            murlocWarleaderPassive,
            southseaCaptainPassive,
            malygosPassive,
        ] = await Passive.createMany([
            {
                internalLabel: "Baron Geddon - fin de tour",
                type: "ACTION",
                triggersOn: "TURN_END",
                actionId: baronDamageAction.id,
                boostId: null,
            },
            {
                internalLabel: "Ragnaros - fin de tour",
                type: "ACTION",
                triggersOn: "TURN_END",
                actionId: ragnarosDamageAction.id,
                boostId: null,
            },
            {
                internalLabel: "Gardien de la Lumière - réactif soin",
                type: "ACTION",
                triggersOn: "HEAL",
                actionId: lightwardenDamageAction.id,
                boostId: null,
            },
            {
                internalLabel: "Démolisseur - début de tour",
                type: "ACTION",
                triggersOn: "TURN_BEGIN",
                actionId: demolisherDamageAction.id,
                boostId: null,
            },
            {
                internalLabel: "Commissaire-priseur - pioche",
                type: "ACTION",
                triggersOn: "DRAW",
                actionId: drawPassiveAction.id,
                boostId: null,
            },
            {
                internalLabel: "Chef de guerre murloc - aura",
                type: "BOOST",
                triggersOn: null,
                actionId: null,
                boostId: murlocWarleaderBoost.id,
            },
            {
                internalLabel: "Capitaine des mers du Sud - aura",
                type: "BOOST",
                triggersOn: null,
                actionId: null,
                boostId: southseaCaptainBoost.id,
            },
            {
                internalLabel: "Malygos - aura spell power",
                type: "BOOST",
                triggersOn: null,
                actionId: null,
                boostId: malygosSpellPowerBoost.id,
            },
        ]);

        const [
            baronGeddon,
            ragnaros,
            gardienLumiere,
            demolisseur,
            commissairePriseur,
            chefGuerreMurloc,
            capitaineMersSud,
            malygos,
        ] = await Minion.createMany([
            { internalLabel: "Baron Geddon", attack: 7, health: 5 },
            { internalLabel: "Ragnaros le Seigneur du Feu", attack: 8, health: 8 },
            { internalLabel: "Gardien de la Lumière", attack: 1, health: 2 },
            { internalLabel: "Démolisseur", attack: 1, health: 4 },
            { internalLabel: "Commissaire-priseur de Gadgetzan", attack: 4, health: 4 },
            { internalLabel: "Chef de guerre murloc", attack: 3, health: 3 },
            { internalLabel: "Capitaine des mers du Sud", attack: 3, health: 3 },
            { internalLabel: "Malygos", attack: 4, health: 12 },
        ]);

        await MinionPassive.createMany([
            { minionId: baronGeddon.id, passiveId: baronPassive.id },
            { minionId: ragnaros.id, passiveId: ragnarosPassive.id },
            { minionId: gardienLumiere.id, passiveId: lightwardenPassive.id },
            { minionId: demolisseur.id, passiveId: demolisherPassive.id },
            { minionId: commissairePriseur.id, passiveId: auctioneerPassive.id },
            { minionId: chefGuerreMurloc.id, passiveId: murlocWarleaderPassive.id },
            { minionId: capitaineMersSud.id, passiveId: southseaCaptainPassive.id },
            { minionId: malygos.id, passiveId: malygosPassive.id },
        ]);

        const passiveCards = await Card.createMany([
            {
                label: "Baron Geddon",
                imageUrl: getClassicCardImage("Baron Geddon"),
                cost: 7,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: baronGeddon.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Ragnaros le Seigneur du Feu",
                imageUrl: getClassicCardImage("Ragnaros le Seigneur du Feu"),
                cost: 8,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: ragnaros.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Gardien de la Lumière",
                imageUrl: getClassicCardImage("Gardien de la Lumière"),
                cost: 1,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: gardienLumiere.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Démolisseur",
                imageUrl: getClassicCardImage("Démolisseur"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: demolisseur.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Commissaire-priseur de Gadgetzan",
                imageUrl: getClassicCardImage("Commissaire-priseur de Gadgetzan"),
                cost: 6,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: commissairePriseur.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Chef de guerre murloc",
                imageUrl: getClassicCardImage("Chef de guerre murloc"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: chefGuerreMurloc.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Capitaine des mers du Sud",
                imageUrl: getClassicCardImage("Capitaine des mers du Sud"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: capitaineMersSud.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Malygos",
                imageUrl: getClassicCardImage("Malygos"),
                cost: 9,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: malygos.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        await CardTag.createMany([
            { cardId: passiveCards[5].id, tagId: murlocTag.id },
            { cardId: passiveCards[6].id, tagId: pirateTag.id },
        ]);
    }
}
