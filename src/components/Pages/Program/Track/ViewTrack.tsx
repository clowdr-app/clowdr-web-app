import { ContentFeed, ProgramTrack, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { CancelablePromise, makeCancelable, removeUndefined } from "@clowdr-app/clowdr-db-schema/build/Util";
import assert from "assert";
import React, { useCallback, useState } from "react";
import SplitterLayout from "react-splitter-layout";
import { ActionButton } from "../../../../contexts/HeadingContext";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import useUserProfile from "../../../../hooks/useUserProfile";
import ViewContentFeed from "../../../ContentFeed/ViewContentFeed";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import TrackColumn from "../All/TrackColumn";
import TrackMarker from "../All/TrackMarker";
import "../All/WholeProgram.scss";
import { SortedEventData, SortedSessionData, SortedTrackData } from "../WholeProgramData";
import "./ViewTrack.scss";

interface Props {
    trackId: string;
}

export default function ViewTrack(props: Props) {
    const conference = useConference();
    const userProfile = useUserProfile();
    const [track, setTrack] = useState<SortedTrackData | null>(null);
    const [feed, setFeed] = useState<ContentFeed | null>(null);
    const [chatSize, setChatSize] = useState(30);

    // Initial data fetch
    useSafeAsync(
        async () => {
            const programTrack = await ProgramTrack.get(props.trackId, conference.id);
            if (programTrack) {
                const sessions = await programTrack?.sessions;
                const sessionsWithTimes: SortedSessionData[] = await Promise.all(sessions.map(async session => {
                    const eventsOfSession = await session.events;
                    const earliestStart = eventsOfSession?.reduce((r, e) => r.getTime() < e.startTime.getTime() ? r : e.startTime, new Date(32503680000000));
                    const latestEnd = eventsOfSession?.reduce((r, e) => r.getTime() > e.endTime.getTime() ? r : e.endTime, new Date(0));
                    const sResult: SortedSessionData = {
                        session,
                        earliestStart,
                        latestEnd,
                        eventsOfSession: (await Promise.all(eventsOfSession.map(async event => {
                            const item = await event.item;
                            assert(item, `Item ${event.itemId} not found! (Event: ${event.id}, Session: ${session.id})`);
                            const eResult: SortedEventData = {
                                event,
                                item: {
                                    item,
                                    authors: await item.authorPerons,
                                    eventsForItem: [event]
                                }
                            };
                            return eResult;
                        }))).sort((x, y) =>
                            x.event.startTime < y.event.startTime ? -1
                                : x.event.startTime === y.event.startTime ? 0
                                    : 1)
                    };
                    return sResult;
                }));

                return {
                    track: programTrack,
                    sessionsOfTrack: sessionsWithTimes.sort((x, y) => {
                        return x.earliestStart < y.earliestStart ? -1
                            : x.earliestStart === y.earliestStart ? 0
                                : 1;
                    }),
                    itemsOfTrack: removeUndefined(await Promise.all((await programTrack.items)
                        .map(async item => {
                            if ((await item.events).length === 0) {
                                return {
                                    item,
                                    authors: await item.authorPerons,
                                    eventsForItem: []
                                };
                            }
                            return undefined;
                        })))
                };
            }
            return undefined;
        },
        setTrack,
        [props.trackId, conference.id], "ViewTrack:setTrack");

    useSafeAsync(
        async () => (await track?.track.feed) ?? null,
        setFeed,
        [track], "ViewTrack:setFeed");

    // Subscribe to data updates
    const onTrackUpdated = useCallback(function _onTrackUpdated(ev: DataUpdatedEventDetails<"ProgramTrack">) {
        for (const object of ev.objects) {
            setTrack(oldTrack => oldTrack ? oldTrack.track.id === object.id ? { ...oldTrack, track: object as ProgramTrack } : oldTrack : null);
        }
    }, []);

    const onTrackDeleted = useCallback(function _onTrackDeleted(ev: DataDeletedEventDetails<"ProgramTrack">) {
        setTrack(oldTrack => oldTrack && ev.objectId === oldTrack.track.id ? null : oldTrack);
    }, []);

    const onContentFeedUpdated = useCallback(function _onContentFeedUpdated(ev: DataUpdatedEventDetails<"ContentFeed">) {
        for (const object of ev.objects) {
            setFeed(oldFeed => oldFeed ? oldFeed.id === object.id ? object as ContentFeed : oldFeed : null);
        }
    }, []);

    const onContentFeedDeleted = useCallback(function _onContentFeedDeleted(ev: DataDeletedEventDetails<"ContentFeed">) {
        setFeed(oldFeed => oldFeed && ev.objectId === oldFeed.id ? null : oldFeed);
    }, []);

    useDataSubscription("ProgramTrack", onTrackUpdated, onTrackDeleted, !track, conference);
    useDataSubscription("ContentFeed", onContentFeedUpdated, onContentFeedDeleted, !feed, conference);

    const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
    const [changingFollow, setChangingFollow] = useState<CancelablePromise<void> | null>(null);
    useSafeAsync(async () => {
        const watched = await userProfile.watched;
        return watched.watchedTracks.includes(props.trackId);
    }, setIsFollowing, [userProfile.watchedId, props.trackId], "ViewTrack:setIsFollowing");

    const onWatchedItemsUpdated = useCallback(function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        for (const object of update.objects) {
            if (object.id === userProfile.watchedId) {
                setIsFollowing((object as WatchedItems).watchedTracks.includes(props.trackId));
            }
        }
    }, [props.trackId, userProfile.watchedId]);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, isFollowing === null, conference);

    const doFollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await userProfile.watched;
                if (!watched.watchedTracks.includes(props.trackId)) {
                    watched.watchedTracks.push(props.trackId);
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
    }, [props.trackId, userProfile.watchedId]);

    const doUnfollow = useCallback(async function _doFollow() {
        try {
            const p = makeCancelable((async () => {
                const watched = await userProfile.watched;
                if (watched.watchedTracks.includes(props.trackId)) {
                    watched.watchedTracks = watched.watchedTracks.filter(x => x !== props.trackId);
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
    }, [props.trackId, userProfile.watchedId]);

    const buttons: Array<ActionButton> = [];
    if (track) {
        if (isFollowing !== null) {
            if (isFollowing) {
                buttons.push({
                    label: changingFollow ? "Changing" : "Unfollow track",
                    icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doUnfollow();
                    },
                    ariaLabel: "Unfollow this track"
                });
            }
            else {
                buttons.push({
                    label: changingFollow ? "Changing" : "Follow track",
                    icon: changingFollow ? <LoadingSpinner message="" /> : <i className="fas fa-star"></i>,
                    action: (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        doFollow();
                    },
                    ariaLabel: "Follow this track"
                });
            }
        }
    }

    buttons.push({
        label: "Program",
        icon: <i className="fas fa-eye"></i>,
        action: "/program",
        ariaLabel: "View the whole program"
    });

    useHeading({
        title: track?.track.name ?? "Track",
        subtitle: track ? <TrackMarker track={track?.track} /> : undefined,
        buttons
    });

    const trackEl = (
        <div className="whole-program single-track">
            {track ? <TrackColumn key={track?.track.id} track={track} /> : <LoadingSpinner />}
        </div>
    );

    return !!feed
        ? <div className="view-track">
            <SplitterLayout
                vertical={true}
                percentage={true}
                ref={component => { component?.setState({ secondaryPaneSize: chatSize }) }}
                onSecondaryPaneSizeChange={newSize => setChatSize(newSize)}
            >
                <div className="split top-split">
                    {trackEl}
                    <button onClick={() => setChatSize(100)}>
                        &#9650;
                </button>
                </div>
                <div className="split bottom-split">
                    <button onClick={() => setChatSize(0)}>
                        &#9660;
                    </button>
                    <div className="embedded-content">
                        <ViewContentFeed feed={feed} />
                    </div>
                </div>
            </SplitterLayout>
        </div>
        : trackEl;
}
