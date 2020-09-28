import { ProgramTrack } from "clowdr-db-schema/src/classes/DataLayer";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "clowdr-db-schema/src/classes/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useDocTitle from "../../../../hooks/useDocTitle";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import TrackColumn from "../All/TrackColumn";
import "../All/WholeProgram.scss";

interface Props {
    trackId: string;
}

export default function ViewTrack(props: Props) {
    const conference = useConference();
    const [track, setTrack] = useState<ProgramTrack | null>(null);

    // Initial data fetch
    useSafeAsync(
        async () => await ProgramTrack.get(props.trackId, conference.id),
        setTrack,
        [props.trackId, conference.id]);

    // Subscribe to data updates
    const onTrackUpdated = useCallback(function _onTrackUpdated(ev: DataUpdatedEventDetails<"ProgramTrack">) {
        if (!track || ev.object.id === track.id) {
            setTrack(ev.object as ProgramTrack);
        }
    }, [track]);

    const onTrackDeleted = useCallback(function _onTrackDeleted(ev: DataDeletedEventDetails<"ProgramTrack">) {
        setTrack(null)
    }, []);

    useDataSubscription("ProgramTrack", onTrackUpdated, onTrackDeleted, !track, conference);

    useDocTitle(track?.name ?? "Track");

    // TODO: Render associated TextChat as a column to the side of the track view

    return <div className="whole-program single-track">
        {track ? <TrackColumn key={track.id} track={track} /> : <LoadingSpinner />}
    </div>;
}
