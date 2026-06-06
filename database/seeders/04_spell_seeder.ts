import Action from "#models/action";
import Card from "#models/card";
import Spell from "#models/spell";
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
        const [heroDamageAction, targetedDamageAction, drawAction, massMinionDamageAction] =
            await Action.createMany([
                {
                    internalLabel: "Sort - 3 dégâts au héros adverse",
                    type: "DAMAGE",
                    isTargeted: false,
                    ...nullActionFields,
                    damage: 3,
                },
                {
                    internalLabel: "Sort - 4 dégâts ciblés à un serviteur adverse",
                    type: "DAMAGE",
                    isTargeted: true,
                    ...nullActionFields,
                    damage: 4,
                },
                {
                    internalLabel: "Sort - Pioche 1 carte",
                    type: "DRAW",
                    isTargeted: false,
                    ...nullActionFields,
                    drawCount: 1,
                },
                {
                    internalLabel: "Sort - 1 dégât à tous les serviteurs adverses",
                    type: "DAMAGE",
                    isTargeted: false,
                    ...nullActionFields,
                    damage: 1,
                },
            ]);

        const [enemyHeroTarget, enemyMinionTarget, enemyMinionsTarget] = await Target.createMany([
            {
                internalLabel: "Héros adverse",
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
                internalLabel: "Tous les serviteurs adverses",
                type: "MINION",
                targetTeam: "OPPONENT",
                comparisonId: null,
                tagId: null,
            },
        ]);

        await ToolToTarget.createMany([
            { targetId: enemyHeroTarget.id, actionId: heroDamageAction.id, boostId: null },
            { targetId: enemyMinionTarget.id, actionId: targetedDamageAction.id, boostId: null },
            {
                targetId: enemyMinionsTarget.id,
                actionId: massMinionDamageAction.id,
                boostId: null,
            },
        ]);

        const [heroDamageSpell, targetedDamageSpell, drawSpell, massMinionDamageSpell] =
            await Spell.createMany([
                {
                    internalLabel: "Sort - Dégâts au héros",
                    actionId: heroDamageAction.id,
                },
                {
                    internalLabel: "Sort - Dégâts ciblés",
                    actionId: targetedDamageAction.id,
                },
                {
                    internalLabel: "Sort - Pioche",
                    actionId: drawAction.id,
                },
                {
                    internalLabel: "Sort - Dégâts de zone",
                    actionId: massMinionDamageAction.id,
                },
            ]);

        await Card.createMany([
            {
                label: "Spell 2 Hero Damage",
                imageUrl: "https://picsum.photos/seed/spell_hero_damage/200/300",
                cost: 2,
                type: "SPELL",
                cardMode: "BETA",
                minionId: null,
                spellId: heroDamageSpell.id,
                weaponId: null,
            },
            {
                label: "Spell 3 Targeted Damage",
                imageUrl: "https://picsum.photos/seed/spell_targeted_damage/200/300",
                cost: 3,
                type: "SPELL",
                cardMode: "BETA",
                minionId: null,
                spellId: targetedDamageSpell.id,
                weaponId: null,
            },
            {
                label: "Spell 1 Draw",
                imageUrl: "https://picsum.photos/seed/spell_draw/200/300",
                cost: 1,
                type: "SPELL",
                cardMode: "BETA",
                minionId: null,
                spellId: drawSpell.id,
                weaponId: null,
            },
            {
                label: "Spell 2 Mass Minion Damage",
                imageUrl: "https://picsum.photos/seed/spell_mass_damage/200/300",
                cost: 2,
                type: "SPELL",
                cardMode: "BETA",
                minionId: null,
                spellId: massMinionDamageSpell.id,
                weaponId: null,
            },
        ]);
    }
}
