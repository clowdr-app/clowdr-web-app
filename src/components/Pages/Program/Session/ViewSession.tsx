import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { ContentFeed, ProgramSession, ProgramSessionEvent, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import React, { useCallback, useEffect, useState } from "react";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import SessionGroup from "../All/SessionGroup";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import "../All/WholeProgram.scss";
import "./ViewSession.scss";
import { ActionButton } from "../../../../contexts/HeadingContext";
import SplitterLayout from "react-splitter-layout";
import ViewContentFeed from "../../../ContentFeed/ViewContentFeed";
import { CancelablePromise, makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import useUserProfile from "../../../../hooks/useUserProfile";
import ChatFrame from "../../../Chat/ChatFrame/ChatFrame";
import { daysIntoYear, generateTimeText } from "../../../../classes/Utils";

interface Props {
    sessionId: string;
}

export default function ViewSession(props: Props) {
    const conference = useConference();
    const userProfile = useUserProfile();
    const [session, setSession] = useState<ProgramSession | null>(null);
    const [sessionFeed, setSessionFeed] = useState<ContentFeed | null>(null);
    const [chatSize, setChatSize] = useState(30);
    const [showEventsList, setShowEventsList] = useState<boolean>(false);
    const [textChatId, setTextChatId] = useState<string | false | null>(null);
    const [refreshTime, setRefreshTime] = useState<number | null>(null);
    const [events, setEvents] = useState<Array<ProgramSessionEvent> | null>(null);

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramSession.get(props.sessionId, conference.id),
        setSession,
        [props.sessionId, conference.id]);

    useSafeAsync(
        async () => (await session?.feed) ?? null,
        setSessionFeed,
        [session]);

    useSafeAsync(
        async () => (await session?.events) ?? null,
        setEvents,
        [session]);

    useSafeAsync(
        async () => {
            if (session && events && sessionFeed) {
                if (sessionFeed.textChatId) {
                    return sessionFeed.textChatId;
                }
                else if (sessionFeed.videoRoomId) {
                    const vidRoom = await sessionFeed.videoRoom;
                    const tc = await vidRoom?.textChat;
                    if (tc) {
                        return tc.id;
                    }
                }
                else {
                    const now = Date.now();
                    const liveEvent = events.find(event => event.startTime.getTime() < now && event.endTime.getTime() > now);
                    if (liveEvent) {
                        const liveItem = await liveEvent.item;
                        const liveFeed = await liveItem.feed;
                        if (liveFeed) {
                            if (liveFeed.textChatId) {
                                return liveFeed.textChatId;
                            }
                            else if (liveFeed.videoRoomId) {
                                const liveVideoRoom = await liveFeed.videoRoom;
                                const liveChat = await liveVideoRoom?.textChat;
                                if (liveChat) {
                                    return liveChat.id;
                                }
                            }
                        }
                    }
                }
                return false;
            }
            return null;
        },
        (data: string | false | null) => {
            setTextChatId(data);
        },
        [session, session?.id, events, refreshTime, sessionFeed]);

    useEffect(() => {
        const _now = Date.now();
        if (session && events && _now < session.endTime.getTime() + (60 * 1000)) {
            // let nextEpoch = session.startTime.getTime();
            // if (_now > nextEpoch) {
            //     nextEpoch = session.endTime.getTime();
            //     const currentEvents
            //         = events
            //             .filter(ev => ev.startTime.getTime() < _now && ev.endTime.getTime() > _now)
            //             .sort((x, y) => x.endTime.getTime() < y.endTime.getTime() ? -1 : 1);
            //     if (currentEvents.length > 0) {
            //         nextEpoch = currentEvents[0].endTime.getTime();
            //     }
            // }
            // const tDist = nextEpoch - _now;
            const t = setInterval(() => {
                setRefreshTime(_now);
            }, 30000); // Math.max(5000, tDist / 2)
            return () => {
                clearInterval(t);
            };
        }
        return () => { };
    }, [session, events]);

    // Subscribe to data updates
    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        for (const object of ev.objects) {
            if (session && object.id === session.id) {
                setSession(object as ProgramSession);
            }
        }
    }, [session]);

    const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        if (session && ev.objectId === session.id) {
            setSession(null);
        }
    }, [session]);

    const onEventUpdated = useCallback(function _onEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        if (session) {
            setEvents(oldEvents => {
                const newEvents = Array.from(oldEvents ?? []);
                for (const object of ev.objects) {
                    const idx = newEvents.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        const event = object as ProgramSessionEvent;
                        if (event.sessionId === session.id) {
                            newEvents.push(object as ProgramSessionEvent);
                            setEvents(newEvents);
                        }
                    }
                    else {
                        newEvents.splice(idx, 1, object as ProgramSessionEvent)
                    }
                }
                return newEvents;
            });
        }
    }, [session]);

    const onEventDeleted = useCallback(function _onEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
        setEvents(oldEvents => oldEvents ? oldEvents.filter(x => x.id !== ev.objectId) : null);
    }, []);

    const onContentFeedUpdated = useCallback(function _onContentFeedUpdated(ev: DataUpdatedEventDetails<"ContentFeed">) {
        for (const object of ev.objects) {
            if (sessionFeed && object.id === sessionFeed.id) {
                setSessionFeed(object as ContentFeed);
            }
        }
    }, [sessionFeed]);

    const onContentFeedDeleted = useCallback(function _onContentFeedDeleted(ev: DataDeletedEventDetails<"ContentFeed">) {
        if (sessionFeed && ev.objectId === sessionFeed.id) {
            setSessionFeed(null);
        }
    }, [sessionFeed]);

    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !session, conference);
    useDataSubscription("ProgramSessionEvent", onEventUpdated, onEventDeleted, !events, conference);
    useDataSubscription("ContentFeed", onContentFeedUpdated, onContentFeedDeleted, !sessionFeed, conference);

    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [changingFollow, setChangingFollow] = useState<CancelablePromise<void> | null>(null);
    useSafeAsync(async () => {
        const watched = await userProfile.watched;
        return watched.watchedSessions.includes(props.sessionId);
    }, setIsFollowing, [userProfile.watchedId, props.sessionId]);

    const onWatchedItemsUpdated = useCallback(function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        for (const object of update.objects) {
            if (object.id === userProfile.watchedId) {
                setIsFollowing((object as WatchedItems).watchedSessions.includes(props.sessionId));
            }
        }
    }, [props.sessionId, userProfile.watchedId]);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, isFollowing === null, conference);

    const doFollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await userProfile.watched;
                if (!watched.watchedSessions.includes(props.sessionId)) {
                    watched.watchedSessions.push(props.sessionId);
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
    }, [props.sessionId, userProfile.watchedId]);

    const doUnfollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await userProfile.watched;
                if (watched.watchedSessions.includes(props.sessionId)) {
                    watched.watchedSessions = watched.watchedSessions.filter(x => x !== props.sessionId);
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
    }, [props.sessionId, userProfile.watchedId]);

    const buttons: Array<ActionButton> = [];
    if (session) {
        if (isFollowing !== null) {
            if (isFollowing) {
                buttons.push({
                    label: changingFollow ? "Changing" : "Unfollow session",
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
                    label: changingFollow ? "Changing" : "Follow session",
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
            label: "Track",
            action: `/track/${session.trackId}`,
            icon: <i className="fas fa-eye"></i>
        });
    }

    buttons.push({
        label: showEventsList ? "Back to session" : "Events in this session",
        icon: <i className="fas fa-eye"></i>,
        action: (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setShowEventsList(!showEventsList);
        }
    });

    let chairStr: JSX.Element | undefined;
    if (session?.chair) {
        chairStr = <>Session chaired by {session.chair}</>;
    }
    else {
        const now = Date.now();
        const liveEvent = events?.find(event => event.startTime.getTime() < now && event.endTime.getTime() > now);
        if (liveEvent?.chair) {
            chairStr = <>Current event chaired by {liveEvent.chair}</>;
        }
    }

    let subtitle: JSX.Element | undefined;
    if (session) {
        function fmtDate(date: Date) {
            return date.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short"
            });
        }

        function fmtTime(date: Date) {
            return date.toLocaleTimeString(undefined, {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        const startDay = daysIntoYear(session.startTime);
        const endDay = daysIntoYear(session.endTime);
        const isSameDay = startDay === endDay;
        const endTimeStr = (!isSameDay ? fmtDate(session.endTime) : "") + " " + fmtTime(session.endTime);
        subtitle =
            <>
                {fmtDate(session.startTime)}&nbsp;&middot;&nbsp;{fmtTime(session.startTime)}{` - ${endTimeStr}`}
                {chairStr ? <>&nbsp;&middot;&nbsp;{chairStr}</> : <></>}
            </>;
    }

    useHeading({
        title: session?.title ?? "Session",
        subtitle,
        buttons: buttons.length > 0 ? buttons : undefined
    });

    const eventsListEl = <div className="whole-program single-track single-session">
        {session
            ? <SessionGroup
                key={session.id}
                session={session}
                overrideTitle="Events in this session"
            />
            : <LoadingSpinner />}
    </div>;

    // TODO: Make this configurable
    // Showing session feed prior to session starting (20mins)
    const isPreShow =
        session &&
        session.startTime.getTime() - (20 * 60 * 1000) < Date.now() &&
        session.startTime.getTime() > Date.now() &&
        session.endTime.getTime() > Date.now();
    const isLive =
        session &&
        session.startTime.getTime() < Date.now() &&
        session.endTime.getTime() > Date.now();

    const sessionStartTimeText = session ? generateTimeText(session.startTime.getTime(), Date.now()) : null;
    const sessionMessage = session
        ? session.endTime.getTime() <= Date.now()
            ? (filler: string) => `This session has ended. Please choose a specific event to participate in its conversation.`
            : (filler: string) => `This session starts in ${sessionStartTimeText?.distance} ${sessionStartTimeText?.units}. ${filler} will appear here and update throughout the session.`
        : (filler: string) => "";
    return <div className={`view-session${showEventsList ? " events-list" : ""}`}>
        {showEventsList ? eventsListEl : <></>}
        {session
            ? <SplitterLayout
                vertical={true}
                percentage={true}
                ref={component => { component?.setState({ secondaryPaneSize: chatSize }) }}
                onSecondaryPaneSizeChange={newSize => setChatSize(newSize)}
            >
                <div className="split top-split">
                    <button onClick={() => setChatSize(100)}>
                        &#9650;
                    </button>
                    <div className="embedded-content">
                        {!sessionFeed
                            ? <LoadingSpinner />
                            : <ViewContentFeed feed={sessionFeed} hideZoomOrVideo={(!isLive && !isPreShow) && sessionMessage("The session's content")} hideTextChat={true} />}
                    </div>
                </div>
                <div className="split bottom-split">
                    {textChatId
                        ? <ChatFrame chatId={textChatId} showChatName={true} />
                        : isLive
                            ? (textChatId === false
                                ? <p>The current event does not have a Clowdr text chat. The conversation may be taking place in another platform.</p>
                                : <LoadingSpinner message="Loading text chat" />)
                            : <p>{sessionMessage("Each event's discussion/Q&A")}</p>
                    }
                    <button onClick={() => setChatSize(0)}>
                        &#9660;
                        </button>
                </div>
            </SplitterLayout>
            : <LoadingSpinner message="Loading session" />
        }
    </div>;
}
