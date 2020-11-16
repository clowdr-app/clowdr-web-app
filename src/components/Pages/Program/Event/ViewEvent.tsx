import {
    DataDeletedEventDetails,
    DataUpdatedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import {
    ProgramItem,
    ProgramSession,
    ProgramSessionEvent,
    ContentFeed,
    WatchedItems,
} from "@clowdr-app/clowdr-db-schema";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { EventPhases, EventViewMode } from "./EventPhases";
import { ProgramSessionWithStartEnd } from "../../../Sidebar/ProgramList";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@material-ui/core";
import { useHistory } from "react-router-dom";

interface Props {
    eventId: string;
}

enum EventViewElements {
    LoadingSpinner,
    YouTube,
    ZoomForChairAndAuthors,
    ZoomForQAndA,
    VideoRoom,
    VideoRoomWithClosedownWarning
}

type EndOfEventActions = "zoom" | "next" | "always-next" | "no-action";

export default function ViewEvent(props: Props) {
    const conference = useConference();
    const userProfile = useUserProfile();
    const [event, setEvent] = useState<ProgramSessionEvent | null>(null);
    const [item, setItem] = useState<ProgramItem | null>(null);
    const [session, setSession] = useState<ProgramSession | null>(null);
    const [eventsOfSession, setEventsOfSession] = useState<ProgramSessionEvent[]>();
    const [sessionFeed, setSessionFeed] = useState<ContentFeed | null>(null);
    const [doJoinZoom, setDoJoinZoom] = useState<boolean>(false);
    const [isInZoom, setIsInZoom] = useState<boolean>(false);

    const [allSessions, setAllSessions] = useState<ProgramSession[]>();
    const [allEvents, setAllEvents] = useState<ProgramSessionEvent[]>();
    const [feeds, setFeeds] = useState<ContentFeed[]>();
    // TODO: Make these live update
    useSafeAsync(async () => ProgramSession.getAll(conference.id), setAllSessions, [conference.id], "ProgramGroup:setAllSessions");
    useSafeAsync(async () => ProgramSessionEvent.getAll(conference.id), setAllEvents, [conference.id], "ProgramGroup:setAllEvents");
    useSafeAsync(async () => ContentFeed.getAll(conference.id), setFeeds, [conference.id], "ProgramGroup:setFeeds");

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramSessionEvent.get(props.eventId, conference.id),
        setEvent,
        [props.eventId, conference.id],
        "ViewEvent:setEvent"
    );
    useSafeAsync(async () => (await event?.item) ?? null, setItem, [event], "ViewEvent:setItem");
    useSafeAsync(async () => (await event?.session) ?? null, setSession, [event], "ViewEvent:setSession");
    useSafeAsync(async () =>
        (await session?.events)
            ?.sort((x, y) => x.startTime.getTime() - y.startTime.getTime())
        , setEventsOfSession,
        [session],
        "ViewEvent:setEventsInSession"
    );
    useSafeAsync(async () => (await session?.feed) ?? null, setSessionFeed, [session], "ViewEvent:setSessionFeed");

    const [refreshTime, setRefreshTime] = useState<number>(0);
    useEffect(() => {
        const t = setInterval(() => {
            setRefreshTime(Date.now());
        }, 1000 * 15);
        return () => {
            clearInterval(t);
        };
    }, [event, refreshTime]);

    // Subscribe to data updates
    const onSessionEventUpdated = useCallback(
        function _onSessionEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
            for (const object of ev.objects) {
                if (event && object.id === event.id) {
                    setEvent(object as ProgramSessionEvent);
                }
            }
        },
        [event]
    );

    const onSessionEventDeleted = useCallback(
        function _onSessionEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
            if (event && event.id === ev.objectId) {
                setEvent(null);
            }
        },
        [event]
    );

    const onItemUpdated = useCallback(
        function _onItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
            for (const object of ev.objects) {
                if (item && object.id === item.id) {
                    setItem(object as ProgramItem);
                }
            }
        },
        [item]
    );

    const onItemDeleted = useCallback(
        function _onItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
            if (item && item.id === ev.objectId) {
                setItem(null);
            }
        },
        [item]
    );

    const onSessionUpdated = useCallback(
        function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
            for (const object of ev.objects) {
                if (session && object.id === session.id) {
                    setSession(object as ProgramSession);
                }
            }
        },
        [session]
    );

    const onSessionDeleted = useCallback(
        function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
            if (session && session.id === ev.objectId) {
                setSession(null);
            }
        },
        [session]
    );

    const onContentFeedUpdated = useCallback(
        function _onContentFeedUpdated(ev: DataUpdatedEventDetails<"ContentFeed">) {
            for (const object of ev.objects) {
                if (sessionFeed && object.id === sessionFeed.id) {
                    setSessionFeed(object as ContentFeed);
                }
            }
        },
        [sessionFeed]
    );

    const onContentFeedDeleted = useCallback(
        function _onContentFeedDeleted(ev: DataDeletedEventDetails<"ContentFeed">) {
            if (sessionFeed && ev.objectId === sessionFeed.id) {
                setSessionFeed(null);
            }
        },
        [sessionFeed]
    );

    useDataSubscription("ProgramSessionEvent", onSessionEventUpdated, onSessionEventDeleted, !event, conference);
    useDataSubscription("ProgramItem", onItemUpdated, onItemDeleted, !item, conference);
    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !session, conference);
    useDataSubscription("ContentFeed", onContentFeedUpdated, onContentFeedDeleted, !event || !session, conference);

    function fmtTime(date: Date) {
        return date.toLocaleTimeString(undefined, {
            hour12: false,
            hour: "numeric",
            minute: "numeric",
        });
    }

    function fmtDay(date: Date) {
        return date.toLocaleDateString(undefined, {
            weekday: "short",
        });
    }

    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [changingFollow, setChangingFollow] = useState<CancelablePromise<void> | null>(null);
    useSafeAsync(
        async () => {
            const watched = await userProfile.watched;
            return watched.watchedEvents.includes(props.eventId);
        },
        setIsFollowing,
        [userProfile.watchedId, props.eventId],
        "ViewEvent:setIsFollowing"
    );

    const onWatchedItemsUpdated = useCallback(
        function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
            for (const object of update.objects) {
                if (object.id === userProfile.watchedId) {
                    setIsFollowing((object as WatchedItems).watchedEvents.includes(props.eventId));
                }
            }
        },
        [props.eventId, userProfile.watchedId]
    );

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, isFollowing === null, conference);

    const doFollow = useCallback(
        async function _doFollow() {
            try {
                const p = makeCancelable(
                    (async () => {
                        const watched = await userProfile.watched;
                        if (!watched.watchedEvents.includes(props.eventId)) {
                            watched.watchedEvents.push(props.eventId);
                            await watched.save();
                        }
                    })()
                );
                setChangingFollow(p);
                await p.promise;
                setChangingFollow(null);
            } catch (e) {
                if (!e.isCanceled) {
                    setChangingFollow(null);
                    throw e;
                }
            }
        },
        // ESLint/React are too stupid to know that `watchedId` is what drives `watched`
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.eventId, userProfile.watchedId]
    );

    const doUnfollow = useCallback(
        async function _doFollow() {
            try {
                const p = makeCancelable(
                    (async () => {
                        const watched = await userProfile.watched;
                        if (watched.watchedEvents.includes(props.eventId)) {
                            watched.watchedEvents = watched.watchedEvents.filter(x => x !== props.eventId);
                            await watched.save();
                        }
                    })()
                );
                setChangingFollow(p);
                await p.promise;
                setChangingFollow(null);
            } catch (e) {
                if (!e.isCanceled) {
                    setChangingFollow(null);
                    throw e;
                }
            }
        },
        // ESLint/React are too stupid to know that `watchedId` is what drives `watched`
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [props.eventId, userProfile.watchedId]
    );


    const buttons = useMemo(() => {
        const _buttons: Array<ActionButton> = [];
        if (event) {
            if (isFollowing !== null) {
                if (isFollowing) {
                    _buttons.push({
                        label: changingFollow ? "Changing" : "Unfollow event",
                        icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                        action: ev => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            doUnfollow();
                        },
                        ariaLabel: "Unfollow this event"
                    });
                } else {
                    _buttons.push({
                        label: changingFollow ? "Changing" : "Follow event",
                        icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                        action: ev => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            doFollow();
                        },
                        ariaLabel: "Follow this event"
                    });
                }
            }
        }
        if (session) {
            _buttons.push({
                label: "Track",
                action: `/track/${session.trackId}`,
                icon: <i className="fas fa-eye"></i>,
                ariaLabel: "View the track for this event"
            });
        }
        return _buttons;
    }, [changingFollow, doFollow, doUnfollow, event, isFollowing, session]);

    const viewMode = useMemo(() => {
        if (event && item && sessionFeed) {
            if (!sessionFeed.youtubeId || !sessionFeed.zoomRoomId) {
                return EventViewMode.Everything;
            }
            else {
                const eventStart = event.startTime.getTime();
                const eventEnd = event.endTime.getTime();
                const now = Date.now();

                const distToStart = now - eventStart;
                const distToEnd = now - eventEnd;

                const second = 1000;
                const minute = 60 * second;

                if (distToStart < -(minute * 20)) {
                    return EventViewMode.PreEvent;
                }
                else if (distToStart < -(minute * 2)) {
                    return EventViewMode.PreShow;
                }
                else if (distToStart < (minute * 0)) {
                    return EventViewMode.PreRoll;
                }
                else if (distToEnd < -(minute * 5)) {
                    return EventViewMode.WatchOnly;
                }
                else if (distToEnd < (minute * 0)) {
                    return EventViewMode.WatchAndQuestion;
                }
                else if (distToEnd < (minute * 15)) {
                    return EventViewMode.QuestionOnly;
                }
                else {
                    return EventViewMode.Breakout;
                }
            }
        }
        return EventViewMode.Loading;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event, item, sessionFeed, refreshTime]);

    const elementsToShow = useMemo(() => {
        // If there is a Zoom + Youtube:
        // Person opens the event page
        //    -- PreEvent: More than 20 mins before the start of the event
        //          - Do not show Zoom
        //          - Do not show YouTube
        //          - Show video room
        //    -- PreShow: Within 20 mins to 2 mins of the start of the event
        //          - Show Zoom for Session Chairs + Authors only
        //          - Do not show YouTube
        //          - Show video room
        //    -- PreRoll: Within 2 mins of the start of the event
        //          - Show Zoom for Session Chairs + Authors only
        //          - Show YouTube
        //          - Show video room + warning that it will close soon
        //    -- WatchOnly: Within first (duration - 5) mins of the event
        //          - Show Zoom for Session Chairs + Authors only
        //          - Show YouTube
        //          - Do not show video room
        //    -- WatchAndQuestion: Within the last 5 mins of the event
        //          - Show Zoom for Q&A
        //          - Show YouTube
        //          - Do not show video room
        //    -- QuestionOnly: Within 15 mins of the end of the event
        //          - Show Zoom for Q&A
        //          - Do not show YouTube
        //          - Do not show video room
        //    -- Breakout: More than 15 mins after the end of the event
        //          - Do not show Zoom for Q&A
        //          - Do not show YouTube
        //          - Show video room

        // If not both Zoom + Youtube:
        // - Always show the session feeds all the time

        switch (viewMode) {
            case EventViewMode.Loading:
                return [EventViewElements.LoadingSpinner];
            case EventViewMode.Everything:
                return [EventViewElements.YouTube, EventViewElements.ZoomForQAndA, EventViewElements.VideoRoom];
            case EventViewMode.PreEvent:
                return [EventViewElements.VideoRoom];
            case EventViewMode.PreShow:
                return [EventViewElements.ZoomForChairAndAuthors, EventViewElements.VideoRoom];
            case EventViewMode.PreRoll:
                return [EventViewElements.ZoomForChairAndAuthors, EventViewElements.VideoRoomWithClosedownWarning, EventViewElements.YouTube];
            case EventViewMode.WatchOnly:
                return [EventViewElements.ZoomForChairAndAuthors, EventViewElements.YouTube];
            case EventViewMode.WatchAndQuestion:
                return [EventViewElements.ZoomForQAndA, EventViewElements.YouTube];
            case EventViewMode.QuestionOnly:
                return [EventViewElements.ZoomForQAndA];
            case EventViewMode.Breakout:
                return [EventViewElements.VideoRoom];
        }
    }, [viewMode]);

    const view = useMemo(() => {
        const subtitle = event ? (
            <>
                {fmtDay(event.startTime)} &middot; {fmtTime(event.startTime)} - {fmtTime(event.endTime)}
                {event.chair ? <>&nbsp;&middot;&nbsp;Chaired by {event.chair}</> : <></>}
                {session ? <>&nbsp;&middot;&nbsp;{session.title}</> : <></>}
            </>
        ) : (
                undefined
            );

        return (
            <div className="program-event">
                {elementsToShow.includes(EventViewElements.LoadingSpinner)
                    ? <LoadingSpinner />
                    : <EventPhases currentMode={viewMode} />}
                {sessionFeed &&
                    (
                        elementsToShow.includes(EventViewElements.YouTube)
                        || elementsToShow.includes(EventViewElements.ZoomForChairAndAuthors)
                        || elementsToShow.includes(EventViewElements.ZoomForQAndA)
                    )
                    ? (
                        <div className="session-feed">
                            {<ViewContentFeed
                                autoJoinZoom={doJoinZoom}
                                setIsInZoom={setIsInZoom}
                                feed={sessionFeed}
                                hideVideoRoom={true}
                                hideTextChat={true}
                                hideYouTube={!elementsToShow.includes(EventViewElements.YouTube)}
                                hideZoomRoom={
                                    !(
                                        elementsToShow.includes(EventViewElements.ZoomForQAndA)
                                        || elementsToShow.includes(EventViewElements.ZoomForChairAndAuthors)
                                    )
                                }
                                zoomButtonText={
                                    elementsToShow.includes(EventViewElements.ZoomForChairAndAuthors)
                                        ? {
                                            app: "Session Chairs and Authors: Join the Zoom room via Zoom's app (recommended)",
                                            browser: "Session Chairs and Authors: Join the Zoom room in-browser"
                                        }
                                        : {
                                            app: "Join the Q&A in Zoom via Zoom's app (recommended)",
                                            browser: "Join the Q&A in Zoom in-browser"
                                        }
                                }
                                zoomAboveYouTube={elementsToShow.includes(EventViewElements.ZoomForQAndA)}
                            />
                            }
                        </div>
                    )
                    : <></>
                }

                {item
                    ? (
                        <ViewItem
                            showFeedName={false}
                            item={item}
                            videoRoomShutdownWarning={elementsToShow.includes(EventViewElements.VideoRoomWithClosedownWarning) ? <b>This event is about to start and the video room will end accordingly.</b> : undefined}
                            textChatFeedOnly={!(elementsToShow.includes(EventViewElements.VideoRoom) || elementsToShow.includes(EventViewElements.VideoRoomWithClosedownWarning))}
                            heading={{
                                title: item?.title ?? "Event",
                                subtitle,
                                buttons: buttons.length > 0 ? buttons : undefined,
                            }}
                        />
                    )
                    : <></>
                }
            </div>
        );
    }, [buttons, doJoinZoom, elementsToShow, event, item, session, sessionFeed, viewMode]);

    // Popups:
    //      - 30 seconds before end of event
    //          - If not in Zoom: Join Zoom for Q&A + stay with current talk and text chat
    //          - If in Zoom: Just ask whether to stay with current event or not
    //          - Or: Go to the next talk
    //          - Or: "Always go to the next talk" option

    // Transitions:
    //      - If Always go to next talk AND not in Zoom: Go to next event

    const sessionsWSE: ProgramSessionWithStartEnd[] | null = useMemo(() => {
        if (allSessions && allEvents) {
            const events = allEvents;
            return allSessions.map(_session => {
                const _eventsOfSession = events.filter(x => x.sessionId === _session.id);
                return {
                    session: _session,
                    earliestStart: _eventsOfSession.reduce(
                        (r, e) => (r.getTime() < e.startTime.getTime() ? r : e.startTime),
                        new Date(32503680000000)
                    ),
                    latestEnd: _eventsOfSession.reduce(
                        (r, e) => (r.getTime() > e.endTime.getTime() ? r : e.endTime),
                        new Date(0)
                    ),
                };
            });
        }
        return null;
    }, [allEvents, allSessions]);

    const [nextEvent, setNextEvent] = useState<{
        id: string;
        name: string;
        startsAt: Date;
    }>();
    const getDefaultAction = () => window.localStorage.getItem("default-next-event-action") as EndOfEventActions | null;
    const [chosenAction, setChosenAction] = useState<EndOfEventActions | null>(getDefaultAction());

    useSafeAsync(async () => {
        if (event && eventsOfSession && sessionsWSE && sessionFeed && feeds && allEvents) {
            let _nextEvent: ProgramSessionEvent | undefined;
            if (eventsOfSession[eventsOfSession.length - 1].id === event.id) {
                // Currently view the last event in the session
                // So we need to find the next session and pull its first event

                const now = Date.now();
                const matchingFeeds = feeds.filter(x => x.youtubeId === sessionFeed.youtubeId || x.zoomRoomId === sessionFeed.zoomRoomId).map(x => x.id);
                const nextSessions
                    = sessionsWSE
                        .filter(x =>
                            x.earliestStart.getTime() > now
                        )
                        .sort((x, y) => x.earliestStart.getTime() - y.earliestStart.getTime());
                const matchingSessions
                    = nextSessions
                        .filter(x => matchingFeeds.includes(x.session.feedId) && x.earliestStart.getTime() < now + (1000 * 60 * 5));
                if (matchingSessions.length > 0) {
                    for (const _nextSession of matchingSessions) {
                        const _nextEvents = allEvents
                            .filter(x => x.sessionId === _nextSession.session.id)
                            .sort((x, y) => x.startTime.getTime() - y.startTime.getTime());
                        if (_nextEvents.length > 0) {
                            _nextEvent = _nextEvents[0];
                            break;
                        }
                    }
                }
                else if (nextSessions.length > 0) {
                    for (const _nextSession of nextSessions) {
                        const _nextEvents = allEvents
                            .filter(x => x.sessionId === _nextSession.session.id)
                            .sort((x, y) => x.startTime.getTime() - y.startTime.getTime());
                        if (_nextEvents.length > 0) {
                            _nextEvent = _nextEvents[0];
                            break;
                        }
                    }
                }
            }
            else {
                _nextEvent = eventsOfSession[eventsOfSession.findIndex(x => x.id === event.id) + 1];
            }

            if (_nextEvent) {
                return {
                    id: _nextEvent.id,
                    name: (await _nextEvent.item).title,
                    startsAt: _nextEvent.startTime
                };
            }
        }
        return undefined;
    }, setNextEvent, [event, eventsOfSession, sessionsWSE, sessionFeed, feeds, allEvents], "ViewEvent:setNextEvent");

    useEffect(() => {
        console.log(`Current event: ${event?.id}, Next event: ${nextEvent?.id}`);
    }, [event, nextEvent]);

    const handleCloseNextEventDialog = (action: EndOfEventActions) => {
        setChosenAction(action);
        if (action === "always-next") {
            window.localStorage.setItem("default-next-event-action", action);
        }
    };

    const endDist = event ? event.endTime.getTime() - Date.now() : -1;
    const isAboutToEnd = !!nextEvent && endDist > 0 && endDist < (1000 * 60);
    const history = useHistory();
    useEffect(() => {
        if (nextEvent && chosenAction && isAboutToEnd && !isInZoom) {
            setChosenAction(getDefaultAction());

            if (chosenAction === "always-next" || chosenAction === "next") {
                setDoJoinZoom(false);
                history.push(`/event/${nextEvent.id}`);
            }
            else if (chosenAction === "zoom") {
                setDoJoinZoom(true);
            }
        }
    }, [chosenAction, history, isAboutToEnd, isInZoom, nextEvent]);

    return (
        <>
            {view}

            <Dialog
                open={isAboutToEnd && !chosenAction && viewMode !== EventViewMode.Everything && !isInZoom}
                onClose={() => handleCloseNextEventDialog("no-action")}
                aria-labelledby="next-session-dialog-title"
                aria-describedby="next-session-dialog-description"
                id="next-session-dialog"
            >
                <DialogTitle id="next-session-dialog-title">
                    Go to next talk?
                </DialogTitle>
                <DialogContent id="next-session-dialog-description">
                    <DialogContentText>
                        This talk is about to end. You can stay with it by joining the Q&amp;A in Zoom
                        or go on to watch the next talk. Please choose below.
                    </DialogContentText>
                    {/* <DialogContentText>
                        You can also choose to hide this popup in future and automatically go to the
                        next talk.
                    </DialogContentText> */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleCloseNextEventDialog("zoom")} color="primary">
                        Join this talk's Q&amp;A in Zoom
                    </Button>
                    <Button onClick={() => handleCloseNextEventDialog("next")} color="primary" autoFocus>
                        Watch next talk
                    </Button>
                    {/* <Button onClick={() => handleCloseNextEventDialog("always-next")} color="primary">
                        Always watch next talk
                    </Button> */}
                </DialogActions>
            </Dialog>
        </>
    );
}
