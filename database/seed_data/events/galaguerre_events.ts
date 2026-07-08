import { defineEvent } from "./define_event.js";

export const GALAGUERRE_EVENTS = [
    defineEvent(1, {
        title: "Pause Galaguerre du lundi aprem",
        shortDescription: "Une pause bien méritée pour mettre au défi vos collègues.",
        longDescription:
            "Rejoignez-nous en jeu le 06/07/2026 à 16h30 pour une petite pause Galaguerre de l'après-midi : choisissez votre deck et lancez une partie classée !",
        imageUrl: "/events/pause-event.webp",
        startsAt: "2026-07-06T16:30:00+02:00",
    }),
    defineEvent(2, {
        title: "Onboarding Galaguerre",
        shortDescription: "Apprendre les bases du jeu",
        longDescription:
            "Venez découvrir Galaguerre aux locaux de Galadrim, vendredi 10 juillet à 13h en salle Vador. Que vous n'ayez jamais joué ou que vous connaissiez déjà les cartes à collectionner, cet atelier est ouvert à tous : on repart de zéro pour expliquer les règles, le déroulement d'une partie et les premières stratégies.",
        imageUrl: "/events/onboarding.webp",
        startsAt: "2026-07-10T13:00:00+02:00",
    }),
] as const;
