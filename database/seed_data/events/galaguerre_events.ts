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
] as const;
