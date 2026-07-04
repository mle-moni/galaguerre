import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import { CenteredLoader } from "~/components/centered_loader";
import { formatEventDate } from "~/helpers/format_event_date";
import { formatEventRegistrationCount } from "~/helpers/format_event_registration_count";
import { useEventsQuery } from "~/hooks/use_events";
import type { ApiEvent } from "#api_types/event.types";
import { EventRegistrationModal } from "./event_registration_modal.jsx";
import { HomePanel } from "./home_panel.jsx";

export const HomeEventsPanel = () => {
    const eventsQuery = useEventsQuery();
    const events = eventsQuery.data ?? [];
    const [activeIndex, setActiveIndex] = useState(0);
    const [registrationTarget, setRegistrationTarget] = useState<ApiEvent | null>(null);

    const safeIndex = events.length === 0 ? 0 : activeIndex % events.length;
    const current = events[safeIndex];

    const goToPrevious = () => {
        if (events.length === 0) return;
        setActiveIndex((index) => (index - 1 + events.length) % events.length);
    };

    const goToNext = () => {
        if (events.length === 0) return;
        setActiveIndex((index) => (index + 1) % events.length);
    };

    return (
        <>
            <HomePanel title="Événements">
                {eventsQuery.isLoading ? (
                    <CenteredLoader />
                ) : eventsQuery.isError ? (
                    <p className="home-event__empty">Impossible de charger les événements</p>
                ) : events.length === 0 ? (
                    <p className="home-event__empty">Aucun événement à venir</p>
                ) : (
                    <div className="home-event-carousel">
                        {events.length > 1 && (
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
                        )}

                        <article className="home-event-carousel__slide">
                            <img
                                src={current.imageUrl}
                                alt={current.title}
                                className="home-event__banner"
                            />
                            <p className="home-event__date">{formatEventDate(current.startsAt)}</p>
                            <h3 className="home-event__title">{current.title}</h3>
                            <p className="home-event__description">{current.shortDescription}</p>
                            {current.registrationCount > 0 && (
                                <p className="home-event__registrations">
                                    {formatEventRegistrationCount(current.registrationCount)}
                                </p>
                            )}
                            <button
                                type="button"
                                className="home-event__btn"
                                onClick={() => setRegistrationTarget(current)}
                            >
                                {current.isRegistered ? "Inscrit" : "S'inscrire"}
                            </button>
                        </article>

                        {events.length > 1 && (
                            <div className="home-event-carousel__dots">
                                {events.map((event, index) => (
                                    <button
                                        key={event.id}
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
                event={registrationTarget}
                onClose={() => setRegistrationTarget(null)}
            />
        </>
    );
};
