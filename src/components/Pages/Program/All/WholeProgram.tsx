import React, { useCallback, useState } from "react";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import "./WholeProgram.scss"
import useSafeAsync from "../../../../hooks/useSafeAsync";
import TrackColumn from "./TrackColumn";
import { ProgramTrack } from "@clowdr-app/clowdr-db-schema";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import Toggle from "react-toggle";
import ScheduleView from "./ScheduleView";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";

export default function WholeProgram() {
    const conference = useConference();

    const [scheduleView, setScheduleView] = useState(true);
    const [tracks, setTracks] = useState<Array<ProgramTrack> | null>(null);

    useHeading("Whole program");

    // Fetch data
    useSafeAsync(async () => await ProgramTrack.getAll(conference.id), setTracks, [conference.id]);

    // Subscribe to changes
    const onTrackUpdated = useCallback(function _onTrackUpdated(ev: DataUpdatedEventDetails<"ProgramTrack">) {
        const newTracks = Array.from(tracks ?? []);
        const idx = newTracks?.findIndex(x => x.id === ev.object.id);
        if (idx === -1) {
            newTracks.push(ev.object as ProgramTrack);
        }
        else {
            newTracks.splice(idx, 1, ev.object as ProgramTrack);
        }
        setTracks(newTracks);
    }, [tracks]);

    const onTrackDeleted = useCallback(function _onTrackDeleted(ev: DataDeletedEventDetails<"ProgramTrack">) {
        if (tracks) {
            setTracks(tracks.filter(x => x.id !== ev.objectId));
        }
    }, [tracks]);

    useDataSubscription("ProgramTrack", onTrackUpdated, onTrackDeleted, !tracks, conference);


    const columns: Array<JSX.Element> = [];
    if (tracks) {
        const trackEntries
            = Array.from(tracks.values())
                    .sort((x, y) => {
                        return x.name.localeCompare(y.name);
                    });

        for (const track of trackEntries) {
            columns.push(<TrackColumn key={track.id} track={track} />);
        }

        if (columns.length === 0) {
            columns.push(<div key="empty">There are no tracks in this program.</div>);
        }
    }

    const schedule = tracks ? <ScheduleView tracks={tracks} /> : <LoadingSpinner />;

    return <div className="whole-program-page">
        <div className="switcher">
            <label>
                <span>Schedule</span>
                <Toggle
                    icons={false}
                    defaultChecked={!scheduleView}
                    onChange={(ev) => setScheduleView(!ev.target.checked)}
                />
                <span>Tracks</span>
            </label>
        </div>
        <div className={`whole-program${scheduleView ? " schedule" : ""}`}>
            {scheduleView ? schedule : columns.length > 0 ? columns : <LoadingSpinner />}
        </div>
    </div>;
}
