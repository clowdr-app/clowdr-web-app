import { ContentFeed, ProgramTrack, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { CancelablePromise, makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
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
// TODO SPLASH: import TrackColumn from "../All/TrackColumn";
import TrackMarker from "../All/TrackMarker";
import "../All/WholeProgram.scss";
import "./ViewTrack.scss";

interface Props {
    trackId: string;
}

export default function ViewTrack(props: Props) {
    const conference = useConference();
    const userProfile = useUserProfile();
    const [track, setTrack] = useState<ProgramTrack | null>(null);
    const [feed, setFeed] = useState<ContentFeed | null>(null);
    const [chatSize, setChatSize] = useState(30);

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramTrack.get(props.trackId, conference.id),
        setTrack,
        [props.trackId, conference.id], "ViewTrack:setTrack");

    useSafeAsync(
        async () => (await track?.feed) ?? null,
        setFeed,
        [track], "ViewTrack:setFeed");

    // Subscribe to data updates
    const onTrackUpdated = useCallback(function _onTrackUpdated(ev: DataUpdatedEventDetails<"ProgramTrack">) {
        for (const object of ev.objects) {
            if (track && object.id === track.id) {
                setTrack(object as ProgramTrack);
            }
        }
    }, [track]);

    const onTrackDeleted = useCallback(function _onTrackDeleted(ev: DataDeletedEventDetails<"ProgramTrack">) {
        if (track && ev.objectId === track.id) {
            setTrack(null);
        }
    }, [track]);

    const onContentFeedUpdated = useCallback(function _onContentFeedUpdated(ev: DataUpdatedEventDetails<"ContentFeed">) {
        for (const object of ev.objects) {
            if (feed && object.id === feed.id) {
                setFeed(object as ContentFeed);
            }
        }
    }, [feed]);

    const onContentFeedDeleted = useCallback(function _onContentFeedDeleted(ev: DataDeletedEventDetails<"ContentFeed">) {
        if (feed && ev.objectId === feed.id) {
            setFeed(null);
        }
    }, [feed]);

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
                    }
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
                    }
                });
            }
        }
    }

    buttons.push({
        label: "Program",
        icon: <i className="fas fa-eye"></i>,
        action: "/program"
    });

    useHeading({
        title: track?.name ?? "Track",
        subtitle: track ? <TrackMarker track={track} /> : undefined,
        buttons
    });

    const trackEl = <></>; // TODO SPLASH
        // = <div className="whole-program single-track">
        //    {track ? <TrackColumn key={track.id} track={track} /> : <LoadingSpinner />}
        // </div>;

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
                        <ViewContentFeed feed={feed} hideZoomOrVideo={false} />
                    </div>
                </div>
            </SplitterLayout>
        </div>
        : trackEl;
}
