import React, { useCallback, useState } from "react";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import "./WholeProgram.scss"
import useSafeAsync from "../../../../hooks/useSafeAsync";
import TrackColumn from "./TrackColumn";
import { ProgramTrack } from "clowdr-db-schema/src/classes/DataLayer";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "clowdr-db-schema/src/classes/DataLayer/Cache/Cache";

export default function WholeProgram() {
    const conference = useConference();

    const [tracks, setTracks] = useState<Map<string, ProgramTrack> | null>(null);

    useHeading("Whole program");

    // Fetch data
    useSafeAsync(async () => {
        const results = await ProgramTrack.getAll(conference.id);
        return new Map(results.map(x => [x.id, x]));
    }, setTracks, [conference.id]);

    // Subscribe to changes
    const onTrackUpdated = useCallback(function _onTrackUpdated(ev: DataUpdatedEventDetails<"ProgramTrack">) {
        const newTracks = tracks ? new Map(tracks) : new Map();
        newTracks.set(ev.object.id, ev.object as ProgramTrack);
        setTracks(newTracks);
    }, [tracks]);

    const onTrackDeleted = useCallback(function _onTrackDeleted(ev: DataDeletedEventDetails<"ProgramTrack">) {
        if (tracks) {
            const newTracks = new Map(tracks);
            newTracks.delete(ev.objectId);
            setTracks(newTracks);
        }
    }, [tracks]);

    useDataSubscription("ProgramTrack", onTrackUpdated, onTrackDeleted, !tracks, conference);


    const columns: Array<JSX.Element> = [];
    const trackEntries
        = tracks
            ? Array.from(tracks.values())
                .sort((x, y) => {
                    return x.name.localeCompare(y.name);
                })
            : [];

    for (const track of trackEntries) {
        columns.push(<TrackColumn key={track.id} track={track} />);
    }

    return <div className="whole-program">
        {columns}
    </div>;
}
