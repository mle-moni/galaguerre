import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
    formatHomeEventDate,
    getUpcomingHomeEvents,
    HOME_MOCK_EVENTS,
} from "../home_mock_data";
import { EventRegistrationModal } from "./event_registration_modal";
import { HomePanel } from "./home_panel";

export const HomeEventsPanel = () => {
    const upcomingEvents = useMemo(() => getUpcomingHomeEvents(HOME_MOCK_EVENTS), []);
    const [activeIndex, setActiveIndex] = useState(0);
    const [registrationTarget, setRegistrationTarget] = useState<
        (typeof upcomingEvents)[number] | null
    >(null);

    const safeIndex =
        upcomingEvents.length === 0 ? 0 : activeIndex % upcomingEvents.length;
    const current = upcomingEvents[safeIndex];

    const goToPrevious = () => {
        if (upcomingEvents.length === 0) return;
        setActiveIndex((index) => (index - 1 + upcomingEvents.length) % upcomingEvents.length);
    };

    const goToNext = () => {
        if (upcomingEvents.length === 0) return;
        setActiveIndex((index) => (index + 1) % upcomingEvents.length);
    };

    return (
        <>
            <HomePanel title="Événements">
                {upcomingEvents.length === 0 ? (
                    <p className="home-event__empty">Aucun événement à venir</p>
                ) : (
                    <div className="home-event-carousel">
                        <div className="home-event-carousel__controls">
                            <button
                                type="button"
                                className="home-event-carousel__nav"
                                onClick={goToPrevious}
                                aria-label="Événement précédent"
                            >
                                <IconChevronLeft size={16} />
                            </button>
                            <button
                                type="button"
                                className="home-event-carousel__nav"
                                onClick={goToNext}
                                aria-label="Événement suivant"
                            >
                                <IconChevronRight size={16} />
                            </button>
                        </div>

                        <article className="home-event-carousel__slide">
                            <img
                                src={current.event.imageUrl}
                                alt={current.event.title}
                                className="home-event__banner"
                            />
                            <p className="home-event__date">{formatHomeEventDate(current.date)}</p>
                            <h3 className="home-event__title">{current.event.title}</h3>
                            <p className="home-event__description">
                                {current.event.shortDescription}
                            </p>
                            <button
                                type="button"
                                className="home-event__btn"
                                onClick={() => setRegistrationTarget(current)}
                            >
                                S'inscrire
                            </button>
                        </article>

                        {upcomingEvents.length > 1 && (
                            <div className="home-event-carousel__dots">
                                {upcomingEvents.map((item, index) => (
                                    <button
                                        key={item.event.id}
                                        type="button"
                                        className={`home-event-carousel__dot${index === safeIndex ? " home-event-carousel__dot--active" : ""}`}
                                        onClick={() => setActiveIndex(index)}
                                        aria-label={`Événement ${index + 1}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </HomePanel>

            <EventRegistrationModal
                event={registrationTarget?.event ?? null}
                eventDate={registrationTarget?.date ?? null}
                onClose={() => setRegistrationTarget(null)}
            />
        </>
    );
};
