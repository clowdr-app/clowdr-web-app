import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { ContentFeed, ProgramSession, WatchedItems } from "@clowdr-app/clowdr-db-schema";
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

interface Props {
    sessionId: string;
}

export default function ViewSession(props: Props) {
    const conference = useConference();
    const userProfile = useUserProfile();
    const [session, setSession] = useState<ProgramSession | null>(null);
    const [feed, setFeed] = useState<ContentFeed | null>(null);
    const [chatSize, setChatSize] = useState(30);
    const [showEventsList, setShowEventsList] = useState<boolean>(false);
    const [textChatId, setTextChatId] = useState<string | false | null>(null);
    const [shouldDoRefresh, setShouldDoRefresh] = useState<boolean>(true);

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramSession.get(props.sessionId, conference.id),
        setSession,
        [props.sessionId, conference.id]);

    useSafeAsync(
        async () => (await session?.feed) ?? null,
        setFeed,
        [session]);

    useSafeAsync(
        async () => {
            if (!shouldDoRefresh) {
                return undefined;
            }

            if (session) {
                const events = await session.events;
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
                return false;
            }
            return null;
        },
        (data) => {
            setShouldDoRefresh(!data);
            setTextChatId(data);
        },
        [session, shouldDoRefresh]);

    useEffect(() => {
        const _now = Date.now();
        if (session && _now < session.endTime.getTime()) {
            const tDist =
                _now < session.startTime.getTime()
                    ? (_now - session.startTime.getTime())
                    : (_now - session.endTime.getTime());
            const t = setInterval(() => {
                setShouldDoRefresh(true);
            }, Math.max(3000, tDist / 2));
            return () => {
                clearInterval(t);
            };
        }
        return () => { };
    }, [session, shouldDoRefresh]);

    // Subscribe to data updates
    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        if (session && ev.object.id === session.id) {
            setSession(ev.object as ProgramSession);
        }
    }, [session]);

    const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        if (session && ev.objectId === session.id) {
            setSession(null);
        }
    }, [session]);

    const onContentFeedUpdated = useCallback(function _onContentFeedUpdated(ev: DataUpdatedEventDetails<"ContentFeed">) {
        if (feed && ev.object.id === feed.id) {
            setFeed(ev.object as ContentFeed);
        }
    }, [feed]);

    const onContentFeedDeleted = useCallback(function _onContentFeedDeleted(ev: DataDeletedEventDetails<"ContentFeed">) {
        if (feed && ev.objectId === feed.id) {
            setFeed(null);
        }
    }, [feed]);

    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !session, conference);
    useDataSubscription("ContentFeed", onContentFeedUpdated, onContentFeedDeleted, !feed, conference);

    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [changingFollow, setChangingFollow] = useState<CancelablePromise<void> | null>(null);
    useSafeAsync(async () => {
        const watched = await userProfile.watched;
        return watched.watchedSessions.includes(props.sessionId);
    }, setIsFollowing, [userProfile.watchedId, props.sessionId]);

    const onWatchedItemsUpdated = useCallback(function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        if (update.object.id === userProfile.watchedId) {
            setIsFollowing((update.object as WatchedItems).watchedSessions.includes(props.sessionId));
        }
    }, [props.sessionId, userProfile.watchedId]);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, () => { }, isFollowing === null, conference);

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

    useHeading({
        title: session?.title ?? "Session",
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

    const isLive = session && session.startTime.getTime() < Date.now() && session.endTime.getTime() > Date.now();
    const isPermanent = !feed || feed.videoRoomId || feed.textChatId || feed.youtubeId;

    return <div className={`view-session${showEventsList ? " events-list" : ""}`}>
        {showEventsList ? eventsListEl : <></>}
        {session
            ? (isLive || isPermanent)
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
                            {!feed
                                ? <LoadingSpinner />
                                : <ViewContentFeed feed={feed} />}
                        </div>
                    </div>
                    <div className="split bottom-split">
                        {textChatId
                            ? <ChatFrame chatId={textChatId} />
                            : isLive
                                ? (textChatId === false
                                    ? <p>The current event does not have a text chat.</p>
                                    : <LoadingSpinner message="Loading text chat" />)
                                : <p>This session is no longer live. Please choose a specific event to participate in its conversation.</p>
                        }
                        <button onClick={() => setChatSize(0)}>
                            &#9660;
                        </button>
                    </div>
                </SplitterLayout>
                : <p>This session is no longer live. Please choose a specific event from the list available via the menu button above.</p>
            : <LoadingSpinner message="Loading session" />
        }
    </div>;
}
