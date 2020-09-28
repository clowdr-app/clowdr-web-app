import React, { useCallback, useState } from "react";
import { ProgramSession, ProgramTrack } from "clowdr-db-schema/src/classes/DataLayer";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "clowdr-db-schema/src/classes/DataLayer/Cache/Cache";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import SessionGroup from "./SessionGroup";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";

interface Props {
    track: ProgramTrack;
}

export default function TrackColumn(props: Props) {
    const conference = useConference();
    const [sessions, setSessions] = useState<Array<ProgramSession> | null>(null);

    // Fetch data
    useSafeAsync(async () => await props.track.sessions, setSessions, [props.track]);

    // Subscribe to changes
    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        const newSessions = Array.from(sessions ?? []);
        const idx = newSessions.findIndex(x => x.id === ev.object.id);
        if (idx === -1) {
            const session = ev.object as ProgramSession;
            if (session.trackId === props.track.id) {
                newSessions.push(ev.object as ProgramSession);
                setSessions(newSessions);
            }
        }
        else {
            newSessions.splice(idx, 1, ev.object as ProgramSession);
            setSessions(newSessions);
        }
    }, [props.track.id, sessions]);

    const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        if (sessions) {
            setSessions(sessions.filter(x => x.id !== ev.objectId));
        }
    }, [sessions]);

    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !sessions, conference);

    const rows: Array<JSX.Element> = [];
    const sessionEntries
        = sessions
            ? sessions.sort((x, y) => {
                return x.startTime < y.startTime ? -1
                    : x.startTime === y.startTime ? 0
                        : 1;
            })
            : [];

    for (const session of sessionEntries) {
        rows.push(<SessionGroup key={session.id} session={session} />);
    }

    if (rows.length === 0) {
        rows.push(<div className="session"><h2 className="title">This track contains no sessions.</h2></div>);
    }

    return <div className="track">
        <h2 className="title">
            <Link to={`/track/${props.track.id}`}>{props.track.name}</Link>
        </h2>
        <div className="content">
            {sessions ? rows : <LoadingSpinner />}
        </div>
    </div>;
}
