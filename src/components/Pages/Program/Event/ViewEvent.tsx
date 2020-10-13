import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { ProgramItem, ProgramSession, ProgramSessionEvent, ContentFeed, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import React, { useCallback, useEffect, useState } from "react";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import "./ViewEvent.scss";
import { ActionButton } from "../../../../contexts/HeadingContext";
import ViewItem from "../Item/ViewItem";
import ViewContentFeed from "../../../ContentFeed/ViewContentFeed";
import useUserProfile from "../../../../hooks/useUserProfile";
import { CancelablePromise, makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";

interface Props {
    eventId: string;
}

export default function ViewEvent(props: Props) {
    const conference = useConference();
    const userProfile = useUserProfile();
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
    useSafeAsync(async () => await event?.item ?? null, setItem, [event]);
    useSafeAsync(async () => await event?.session ?? null, setSession, [event]);
    useSafeAsync(async () => (await session?.feed) ?? null, setSessionFeed, [session]);
    useSafeAsync(async () => event ? ((await event.feed) ?? "not present") : null, setEventFeed, [event]);

    const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
    useEffect(() => {
        const _now = Date.now();
        if (event && _now < event.endTime.getTime()) {
            const tDist =
                _now < event.startTime.getTime()
                    ? (_now - event.startTime.getTime())
                    : (_now - event.endTime.getTime());
            const t = setTimeout(() => {
                setRefreshTrigger(old => !old);
            }, Math.max(3000, tDist / 2));
            return () => {
                clearTimeout(t);
            };
        }
        return () => { };
    }, [event, refreshTrigger]);

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

    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [changingFollow, setChangingFollow] = useState<CancelablePromise<void> | null>(null);
    useSafeAsync(async () => {
        const watched = await userProfile.watched;
        return watched.watchedEvents.includes(props.eventId);
    }, setIsFollowing, [userProfile.watchedId, props.eventId]);

    const onWatchedItemsUpdated = useCallback(function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        if (update.object.id === userProfile.watchedId) {
            setIsFollowing((update.object as WatchedItems).watchedEvents.includes(props.eventId));
        }
    }, [props.eventId, userProfile.watchedId]);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, () => { }, isFollowing === null, conference);

    const doFollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await userProfile.watched;
                if (!watched.watchedEvents.includes(props.eventId)) {
                    watched.watchedEvents.push(props.eventId);
                    await watched.save();
                }
            })());
            setChangingFollow(p);
            await p.promise;
            setChangingFollow(null);
        }
        catch (e) {
            if (!e.isCanceled) {
                setChangingFollow(null);
                throw e;
            }
        }
        // ESLint/React are too stupid to know that `watchedId` is what drives `watched`
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.eventId, userProfile.watchedId]);

    const doUnfollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await userProfile.watched;
                if (watched.watchedEvents.includes(props.eventId)) {
                    watched.watchedEvents = watched.watchedEvents.filter(x => x !== props.eventId);
                    await watched.save();
                }
            })());
            setChangingFollow(p);
            await p.promise;
            setChangingFollow(null);
        }
        catch (e) {
            if (!e.isCanceled) {
                setChangingFollow(null);
                throw e;
            }
        }
        // ESLint/React are too stupid to know that `watchedId` is what drives `watched`
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.eventId, userProfile.watchedId]);

    const buttons: Array<ActionButton> = [];
    if (event) {
        if (isFollowing !== null) {
            if (isFollowing) {
                buttons.push({
                    label: changingFollow ? "Changing" : "Unfollow event",
                    icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doUnfollow();
                    }
                });
            }
            else {
                buttons.push({
                    label: changingFollow ? "Changing" : "Follow event",
                    icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doFollow();
                    }
                });
            }
        }

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

    // TODO: directLink?

    // TODO: Offer to auto-move to the session's next event 30 secs before the
    //       end of the current event

    const renderNow = Date.now();
    const eventIsLive = !!event && event.startTime.getTime() < renderNow && event.endTime.getTime() > renderNow;
    const sessionIsLive = !!session && session.startTime.getTime() < renderNow && session.endTime.getTime() > renderNow;
    return <div className="program-event">
        {sessionFeed
            ? <div className="session-feed">
                <h2>{sessionFeed.name}</h2>
                <ViewContentFeed feed={sessionFeed} hideZoom={!eventIsLive} />
            </div>
            : <LoadingSpinner message="Loading session feed" />}
        {/* TODO: Re-enable this for splash?
         {eventFeed
            ? (eventFeed !== "not present"
                ? !isLive || (eventFeed.youtubeId || eventFeed.zoomRoomId)
                    ? <div className="event-feed">
                        <h2>{eventFeed.name}</h2>
                        <ViewContentFeed feed={eventFeed} />
                    </div>
                    : <></>
                : <></>)
            : <LoadingSpinner message="Loading event feed" />
        } */}
        {item
            ? <ViewItem
                item={item}
                // TODO: For SPLASH: && eventHasEnded
                textChatFeedOnly={eventIsLive || sessionIsLive}
                heading={{
                    title: item?.title ?? "Event",
                    subtitle: event ? <>{fmtDay(event.startTime)} &middot; {fmtTime(event.startTime)} - {fmtTime(event.endTime)}</> : undefined,
                    buttons: buttons.length > 0 ? buttons : undefined
                }} />
            : <LoadingSpinner />}
    </div>;
}
