import Card from "#models/card";
import CardSet from "#models/card_set";
import CardTag from "#models/card_tag";
import Minion from "#models/minion";
import MinionPower from "#models/minion_power";
import Tag from "#models/tag";
import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { HEARTHSTONE_CARD_SET_NAME } from "../seed_data/card_set_names.js";
import { getClassicCardImage } from "../seed_data/classic_card_images.js";

export default class extends BaseSeeder {
    async run() {
        const hearthstoneSet = await CardSet.findByOrFail("name", HEARTHSTONE_CARD_SET_NAME);

        const tauntPower = await MinionPower.create({
            hasTaunt: true,
            hasCharge: false,
            hasWindfury: false,
            isPoisonous: false,
        });

        const chargePower = await MinionPower.create({
            hasTaunt: false,
            hasCharge: true,
            hasWindfury: false,
            isPoisonous: false,
        });

        const windfuryPower = await MinionPower.create({
            hasTaunt: false,
            hasCharge: false,
            hasWindfury: true,
            isPoisonous: false,
        });

        const poisonousPower = await MinionPower.create({
            hasTaunt: false,
            hasCharge: false,
            hasWindfury: false,
            isPoisonous: true,
        });

        const [beastTag, mechTag] = await Tag.createMany([
            { name: "beast", symbol: "🦁", label: "Bête" },
            { name: "mech", symbol: "⚙️", label: "Méca" },
        ]);

        const [
            lutin,
            eclaireurPandaren,
            sanglier,
            porteBouclier,
            jeuneFauconDragon,
            dragonMecanique,
            moineShadoPan,
            cobraEmpereur,
            patriarcheDosArgente,
            guerrierTauren,
            farseerThrallmar,
            maitreBrasseur,
            chevalierHurlevent,
            corsaireRedoutable,
            dimetrodon,
            leeroyJenkins,
            rampantFondrieres,
            commandantArgente,
            harpieFurieDesVents,
            seigneurArene,
            geantDesMers,
        ] = await Minion.createMany([
            { internalLabel: "Lutin", attack: 1, health: 1 },
            { internalLabel: "Éclaireur pandaren", attack: 1, health: 1 },
            { internalLabel: "Sanglier", attack: 1, health: 1 },
            {
                internalLabel: "Porte-bouclier",
                attack: 0,
                health: 4,
                minionPowerId: tauntPower.id,
            },
            {
                internalLabel: "Jeune faucon-dragon",
                attack: 1,
                health: 1,
                minionPowerId: windfuryPower.id,
            },
            { internalLabel: "Dragon mécanique", attack: 2, health: 1 },
            { internalLabel: "Moine du Shado-Pan", attack: 2, health: 2 },
            {
                internalLabel: "Cobra empereur",
                attack: 2,
                health: 3,
                minionPowerId: poisonousPower.id,
            },
            {
                internalLabel: "Patriarche dos-argenté",
                attack: 1,
                health: 4,
                minionPowerId: tauntPower.id,
            },
            {
                internalLabel: "Guerrier tauren",
                attack: 2,
                health: 3,
                minionPowerId: tauntPower.id,
            },
            {
                internalLabel: "Farseer de Thrallmar",
                attack: 2,
                health: 3,
                minionPowerId: windfuryPower.id,
            },
            { internalLabel: "Maître brasseur", attack: 4, health: 4 },
            {
                internalLabel: "Chevalier de Hurlevent",
                attack: 2,
                health: 5,
                minionPowerId: chargePower.id,
            },
            {
                internalLabel: "Corsaire redoutable",
                attack: 3,
                health: 3,
                minionPowerId: tauntPower.id,
            },
            { internalLabel: "Dimetrodon", attack: 5, health: 5 },
            {
                internalLabel: "Leeroy Jenkins",
                attack: 6,
                health: 2,
                minionPowerId: chargePower.id,
            },
            {
                internalLabel: "Rampant des fondrières",
                attack: 3,
                health: 6,
                minionPowerId: tauntPower.id,
            },
            {
                internalLabel: "Commandant argenté",
                attack: 4,
                health: 2,
                minionPowerId: chargePower.id,
            },
            {
                internalLabel: "Harpie furie des vents",
                attack: 4,
                health: 5,
                minionPowerId: windfuryPower.id,
            },
            {
                internalLabel: "Seigneur de l'Arène",
                attack: 6,
                health: 5,
                minionPowerId: tauntPower.id,
            },
            { internalLabel: "Géant des mers", attack: 8, health: 8 },
        ]);

        const cards = await Card.createMany([
            {
                label: "Lutin",
                imageUrl: getClassicCardImage("Lutin"),
                cost: 0,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: lutin.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Éclaireur pandaren",
                imageUrl: getClassicCardImage("Éclaireur pandaren"),
                cost: 1,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: eclaireurPandaren.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Sanglier",
                imageUrl: getClassicCardImage("Sanglier"),
                cost: 1,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: sanglier.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Porte-bouclier",
                imageUrl: getClassicCardImage("Porte-bouclier"),
                cost: 1,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: porteBouclier.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Jeune faucon-dragon",
                imageUrl: getClassicCardImage("Jeune faucon-dragon"),
                cost: 1,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: jeuneFauconDragon.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Dragon mécanique",
                imageUrl: getClassicCardImage("Dragon mécanique"),
                cost: 1,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: dragonMecanique.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Moine du Shado-Pan",
                imageUrl: getClassicCardImage("Moine du Shado-Pan"),
                cost: 2,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: moineShadoPan.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Cobra empereur",
                imageUrl: getClassicCardImage("Cobra empereur"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: cobraEmpereur.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Patriarche dos-argenté",
                imageUrl: getClassicCardImage("Patriarche dos-argenté"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: patriarcheDosArgente.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Guerrier tauren",
                imageUrl: getClassicCardImage("Guerrier tauren"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: guerrierTauren.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Farseer de Thrallmar",
                imageUrl: getClassicCardImage("Farseer de Thrallmar"),
                cost: 3,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: farseerThrallmar.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Maître brasseur",
                imageUrl: getClassicCardImage("Maître brasseur"),
                cost: 4,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: maitreBrasseur.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Chevalier de Hurlevent",
                imageUrl: getClassicCardImage("Chevalier de Hurlevent"),
                cost: 4,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: chevalierHurlevent.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Corsaire redoutable",
                imageUrl: getClassicCardImage("Corsaire redoutable"),
                cost: 4,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: corsaireRedoutable.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Dimetrodon",
                imageUrl: getClassicCardImage("Dimetrodon"),
                cost: 5,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: dimetrodon.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Leeroy Jenkins",
                imageUrl: getClassicCardImage("Leeroy Jenkins"),
                cost: 5,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: leeroyJenkins.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Rampant des fondrières",
                imageUrl: getClassicCardImage("Rampant des fondrières"),
                cost: 5,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: rampantFondrieres.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Commandant argenté",
                imageUrl: getClassicCardImage("Commandant argenté"),
                cost: 6,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: commandantArgente.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Harpie furie des vents",
                imageUrl: getClassicCardImage("Harpie furie des vents"),
                cost: 6,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: harpieFurieDesVents.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Seigneur de l'Arène",
                imageUrl: getClassicCardImage("Seigneur de l'Arène"),
                cost: 6,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: seigneurArene.id,
                spellId: null,
                weaponId: null,
            },
            {
                label: "Géant des mers",
                imageUrl: getClassicCardImage("Géant des mers"),
                cost: 10,
                type: "MINION",
                cardSetId: hearthstoneSet.id,
                minionId: geantDesMers.id,
                spellId: null,
                weaponId: null,
            },
        ]);

        const cardByMinionId = new Map(cards.map((c) => [c.minionId, c]));

        await CardTag.createMany([
            { cardId: cardByMinionId.get(sanglier.id)!.id, tagId: beastTag.id },
            { cardId: cardByMinionId.get(jeuneFauconDragon.id)!.id, tagId: beastTag.id },
            { cardId: cardByMinionId.get(patriarcheDosArgente.id)!.id, tagId: beastTag.id },
            { cardId: cardByMinionId.get(dimetrodon.id)!.id, tagId: beastTag.id },
            { cardId: cardByMinionId.get(dragonMecanique.id)!.id, tagId: mechTag.id },
        ]);
    }
}
