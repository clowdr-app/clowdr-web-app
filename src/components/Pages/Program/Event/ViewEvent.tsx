import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { ProgramItem, ProgramSession, ProgramSessionEvent, ContentFeed } from "@clowdr-app/clowdr-db-schema";
import React, { useCallback, useState } from "react";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import "./ViewEvent.scss";
import { ActionButton } from "../../../../contexts/HeadingContext";
import ViewItem from "../Item/ViewItem";
import ViewContentFeed from "../../../ContentFeed/ViewContentFeed";

interface Props {
    eventId: string;
}

export default function ViewEvent(props: Props) {
    const conference = useConference();
    const [event, setEvent] = useState<ProgramSessionEvent | null>(null);
    const [item, setItem] = useState<ProgramItem | null>(null);
    const [session, setSession] = useState<ProgramSession | null>(null);
    const [sessionFeed, setSessionFeed] = useState<ContentFeed | null>(null);
    const [eventFeed, setEventFeed] = useState<ContentFeed | "not present" | null>(null);

    // TODO: Build a re-usable "View all the times this program item is scheduled" component
    //       to be accessible via an Actions Button on an EventItem or embedded in an ViewItem

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramSessionEvent.get(props.eventId, conference.id),
        setEvent,
        [props.eventId, conference.id]);
    useSafeAsync(async () => await event?.item, setItem, [event]);
    useSafeAsync(async () => await event?.session, setSession, [event]);
    useSafeAsync(async () => (await session?.feed) ?? null, setSessionFeed, [session]);
    useSafeAsync(async () => event ? ((await event.feed) ?? "not present") : null, setEventFeed, [event]);

    // Subscribe to data updates
    const onSessionEventUpdated = useCallback(function _onSessionEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        if (event && ev.object.id === event.id) {
            setEvent(ev.object as ProgramSessionEvent);
        }
    }, [event]);

    const onSessionEventDeleted = useCallback(function _onSessionEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
        if (event && event.id === ev.objectId) {
            setEvent(null)
        }
    }, [event]);

    const onItemUpdated = useCallback(function _onItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        if (item && ev.object.id === item.id) {
            setItem(ev.object as ProgramItem);
        }
    }, [item]);

    const onItemDeleted = useCallback(function _onItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        if (item && item.id === ev.objectId) {
            setItem(null)
        }
    }, [item]);

    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        if (session && ev.object.id === session.id) {
            setSession(ev.object as ProgramSession);
        }
    }, [session]);

    const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        if (session && session.id === ev.objectId) {
            setSession(null)
        }
    }, [session]);

    const onContentFeedUpdated = useCallback(function _onContentFeedUpdated(ev: DataUpdatedEventDetails<"ContentFeed">) {
        if (sessionFeed && ev.object.id === sessionFeed.id) {
            setSessionFeed(ev.object as ContentFeed);
        }

        if (eventFeed && eventFeed !== "not present" && ev.object.id === eventFeed.id) {
            setEventFeed(ev.object as ContentFeed);
        }
    }, [sessionFeed, eventFeed]);

    const onContentFeedDeleted = useCallback(function _onContentFeedDeleted(ev: DataDeletedEventDetails<"ContentFeed">) {
        if (sessionFeed && ev.objectId === sessionFeed.id) {
            setSessionFeed(null);
        }

        if (eventFeed && eventFeed !== "not present" && ev.objectId === eventFeed.id) {
            setEventFeed(null);
        }
    }, [sessionFeed, eventFeed]);

    useDataSubscription("ProgramSessionEvent", onSessionEventUpdated, onSessionEventDeleted, !event, conference);
    useDataSubscription("ProgramItem", onItemUpdated, onItemDeleted, !item, conference);
    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !session, conference);
    useDataSubscription("ContentFeed", onContentFeedUpdated, onContentFeedDeleted, !event || !session, conference);

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

    // WATCH_TODO: Watch event action button via the item's useHeading call (pass as props)

    // TODO: directLink?

    // TODO: Offer to auto-move to the session's next event 30 secs before the
    //       end of the current event

    return <div className="program-event">
        {sessionFeed
            ? <div className="session-feed">
                <h2>{sessionFeed.name}</h2>
                <ViewContentFeed feed={sessionFeed} />
            </div>
            : <LoadingSpinner message="Loading session feed" />}
        {eventFeed
            ? (eventFeed !== "not present"
                ? <div className="event-feed">
                    <h2>{eventFeed.name}</h2>
                    <ViewContentFeed feed={eventFeed} />
                </div>
                : <></>)
            : <LoadingSpinner message="Loading event feed" />}
        {item
            ? <ViewItem item={item} heading={{
                title: item?.title ?? "Event",
                subtitle: event ? <>{fmtDay(event.startTime)} &middot; {fmtTime(event.startTime)} - {fmtTime(event.endTime)}</> : undefined,
                buttons: buttons.length > 0 ? buttons : undefined
            }} />
            : <LoadingSpinner />}
    </div>;
}
