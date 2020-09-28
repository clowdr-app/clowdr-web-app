import { DataDeletedEventDetails, DataUpdatedEventDetails } from "clowdr-db-schema/src/classes/DataLayer/Cache/Cache";
import { ProgramItem, ProgramPerson, ProgramSession, ProgramSessionEvent } from "clowdr-db-schema/src/classes/DataLayer";
import React, { useCallback, useState } from "react";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import "./ViewEvent.scss";
import AuthorsList from "../AuthorsList";
import { ActionButton } from "../../../../contexts/HeadingContext";

interface Props {
    eventId: string;
}

export default function ViewEvent(props: Props) {
    const conference = useConference();
    const [event, setEvent] = useState<ProgramSessionEvent | null>(null);
    const [item, setItem] = useState<ProgramItem | null>(null);
    const [session, setSession] = useState<ProgramSession | null>(null);
    const [authors, setAuthors] = useState<Array<ProgramPerson> | null>(null);

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramSessionEvent.get(props.eventId, conference.id),
        setEvent,
        [props.eventId, conference.id]);
    useSafeAsync(async () => await event?.item, setItem, [event]);
    useSafeAsync(async () => await event?.session, setSession, [event]);
    useSafeAsync(async () => item ? await item.authors : null, setAuthors, [item]);

    // Subscribe to data updates
    const onSessionEventUpdated = useCallback(function _onSessionEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        if (!event || ev.object.id === event.id) {
            setEvent(ev.object as ProgramSessionEvent);
        }
    }, [event]);

    const onSessionEventDeleted = useCallback(function _onSessionEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
        setEvent(null)
    }, []);

    const onItemUpdated = useCallback(function _onItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        if (!item || ev.object.id === item.id) {
            setItem(ev.object as ProgramItem);
        }
    }, [item]);

    const onItemDeleted = useCallback(function _onItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        setItem(null)
    }, []);

    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        if (!session || ev.object.id === session.id) {
            setSession(ev.object as ProgramSession);
        }
    }, [session]);

    const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        setSession(null)
    }, []);

    const onAuthorUpdated = useCallback(function _onAuthorUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
        const newAuthors = Array.from(authors ?? []);
        const idx = newAuthors.findIndex(x => x.id === ev.object.id);
        if (idx > -1) {
            newAuthors.splice(idx, 1, ev.object as ProgramPerson)
            setAuthors(newAuthors);
        }
    }, [authors]);

    const onAuthorDeleted = useCallback(function _onAuthorDeleted(ev: DataDeletedEventDetails<"ProgramPerson">) {
        if (authors) {
            setAuthors(authors.filter(x => x.id !== ev.objectId));
        }
    }, [authors]);

    useDataSubscription("ProgramSessionEvent", onSessionEventUpdated, onSessionEventDeleted, !event, conference);
    useDataSubscription("ProgramPerson", onAuthorUpdated, onAuthorDeleted, !authors, conference);
    useDataSubscription("ProgramItem", onItemUpdated, onItemDeleted, !item, conference);
    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !session, conference);

    function fmtTime(date: Date) {
        return date.toLocaleTimeString(undefined, {
            hour12: false,
            hour: "numeric",
            minute: "numeric"
        });
    }

    function fmtDay(date: Date) {
        return date.toLocaleDateString(undefined, {
            weekday: "short"
        });
    }

    const buttons: Array<ActionButton> = [];
    if (event) {
        buttons.push({
            label: "Session",
            action: `/session/${event.sessionId}`,
            icon: <i className="fas fa-eye"></i>
        });
    }
    if (session) {
        buttons.push({
            label: "Track",
            action: `/track/${session.trackId}`,
            icon: <i className="fas fa-eye"></i>
        });
    }
    if (item) {
        // TODO: Action button for viewing all session events (i.e. scheduled
        //       times) for this event's program item
    }

    useHeading({
        title: item?.title ?? "SessionEvent",
        subtitle: event ? <>{fmtDay(event.startTime)} &middot; {fmtTime(event.startTime)} - {fmtTime(event.endTime)}</> : undefined,
        buttons: buttons.length > 0 ? buttons : undefined
    });

    // TODO: posterImage?

    // TODO: directLink?

    // TODO: Render the content feed(s) (re-use component from ViewSession)

    // TODO: Offer to auto-move to the sessions' next event 30 secs before the
    //       end of the current event

    return <div className="program-event">
        {event && item && authors
            ? <>
                <div className="info">
                    <p className="abstract">
                        {item.abstract}
                    </p>
                    <AuthorsList authors={authors} />
                </div>
                <hr />
            </>
            : <LoadingSpinner />}
    </div>;
}
