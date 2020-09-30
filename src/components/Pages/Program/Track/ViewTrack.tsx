import { ContentFeed, ProgramTrack, TextChat } from "@clowdr-app/clowdr-db-schema/build/DataLayer";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useHeading from "../../../../hooks/useHeading";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import ChatFrame from "../../../Chat/ChatFrame/ChatFrame";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import TrackColumn from "../All/TrackColumn";
import TrackMarker from "../All/TrackMarker";
import "../All/WholeProgram.scss";

interface Props {
    trackId: string;
}

export default function ViewTrack(props: Props) {
    const conference = useConference();
    const [track, setTrack] = useState<ProgramTrack | null>(null);
    const [feed, setFeed] = useState<ContentFeed | null>(null);
    const [textChat, setTextChat] = useState<TextChat | "not present" | null>(null);

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramTrack.get(props.trackId, conference.id),
        setTrack,
        [props.trackId, conference.id]);

    useSafeAsync(
        async () => (await track?.feed) ?? null,
        setFeed,
        [track]);

    useSafeAsync(
        async () => feed ? ((await feed.textChat) ?? "not present") : null,
        setTextChat,
        [feed]);

    // Subscribe to data updates
    const onTrackUpdated = useCallback(function _onTrackUpdated(ev: DataUpdatedEventDetails<"ProgramTrack">) {
        if (track && ev.object.id === track.id) {
            setTrack(ev.object as ProgramTrack);
        }
    }, [track]);

    const onTrackDeleted = useCallback(function _onTrackDeleted(ev: DataDeletedEventDetails<"ProgramTrack">) {
        if (track && ev.objectId === track.id) {
            setTrack(null);
        }
    }, [track]);

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

    useDataSubscription("ProgramTrack", onTrackUpdated, onTrackDeleted, !track, conference);
    useDataSubscription("ContentFeed", onContentFeedUpdated, onContentFeedDeleted, !feed, conference);

    useHeading({
        title: track?.name ?? "Track",
        subtitle: track ? <TrackMarker track={track} /> : undefined
    });

    // TODO: Render TextChat as a column to the side of the track view

    return <div className="view-track">
        <div className="whole-program single-track">
            {track ? <TrackColumn key={track.id} track={track} /> : <LoadingSpinner />}
        </div>
        {!!feed
            ? <div className="embedded-content">
                {textChat && textChat !== "not present"
                    ? <ChatFrame chatSid={textChat.twilioID} />
                    : <div className="invalid">This track has been given an invalid or unsupported feed.</div>}
                </div>
            : <></>
        }
    </div>;
}
