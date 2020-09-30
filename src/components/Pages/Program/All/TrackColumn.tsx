import React, { useCallback, useState } from "react";
import { ProgramItem, ProgramSession, ProgramSessionEvent, ProgramTrack } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import SessionGroup from "./SessionGroup";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import TrackMarker from "./TrackMarker";
import Item from "./Item";

interface Props {
    track: ProgramTrack;
}

export default function TrackColumn(props: Props) {
    const conference = useConference();
    const [sessions, setSessions] = useState<Array<ProgramSession> | null>(null);
    const [items, setItems] = useState<Array<ProgramItem> | null>(null);

    // Fetch data
    useSafeAsync(async () => await props.track.sessions, setSessions, [props.track]);
    useSafeAsync(async () => {
        const _items = await props.track.items;
        const events: Map<string, ProgramSessionEvent[]> = new Map();
        await Promise.all(_items.map(async x => {
            events.set(x.id, await x.events);
        }));
        return _items.filter(x => !events.get(x.id)?.length);
    }, setItems, [props.track]);

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

    if (items && items.length > 0) {
        if (sessionEntries.length > 0) {
            rows.push(<hr />);
            const _rows: Array<JSX.Element> = [];
            for (const item of items.sort((x, y) => x.title.localeCompare(y.title))) {
                _rows.push(<Item item={item} clickable={true} />);
            }
            rows.push(<div className="session">
                <h2 className="title">Unscheduled items</h2>
                <div className="content">
                    {_rows}
                </div>
            </div>);
        }
        else {
            for (const item of items.sort((x, y) => x.title.localeCompare(y.title))) {
                rows.push(<Item item={item} clickable={true} />);
            }
        }
    }

    if (rows.length === 0) {
        rows.push(<div key="empty" className="session"><h2 className="title">This track contains no sessions.</h2></div>);
    }

    return <div className="track">
        <h2 className="title">
            <TrackMarker track={props.track} small={true} />
            <Link to={`/track/${props.track.id}`}>{props.track.name}</Link>
        </h2>
        <div className="content">
            {sessions && items ? rows : <LoadingSpinner />}
        </div>
    </div>;
}
