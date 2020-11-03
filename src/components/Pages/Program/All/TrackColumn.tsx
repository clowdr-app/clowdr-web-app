import React, { useCallback, useState } from "react";
import { ProgramItem, ProgramSession, ProgramTrack } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import SessionGroup from "./SessionGroup";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import TrackMarker from "./TrackMarker";
import Item from "./Item";
import { WholeProgramData } from "../WholeProgramData";

interface Props {
    track: ProgramTrack;
    data?: WholeProgramData;
}

export default function TrackColumn(props: Props) {
    // TODO SPLASH

    // const conference = useConference();
    // const [sessions, setSessions] = useState<Array<ProgramSession> | null>(props.data?.sessions?.filter(x => x.trackId === props.track.id) ?? null);
    // const [items, setItems] = useState<Array<ProgramItem> | null>(null);

    // // Fetch data
    // useSafeAsync(
    //     async () => sessions ?? await props.track.sessions,
    //     setSessions,
    //     [props.track.id, props.data?.sessions]);
    // useSafeAsync(async () => {
    //     const _items = props.data?.items?.filter(x => x.trackId === props.track.id) ?? await props.track.items;
    //     const events: Map<string, number> = new Map();
    //     await Promise.all(_items.map(async x => {
    //         events.set(x.id, (props.data?.events?.filter(y => y.itemId === x.id) ?? await x.events).length);
    //     }));
    //     return _items.filter(x => !events.get(x.id));
    // }, setItems, [props.track.id]);

    // // Subscribe to changes
    // const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
    //     setSessions(oldSessions => {
    //         const newSessions = Array.from(oldSessions ?? []);
    //         for (const object of ev.objects) {
    //             const idx = newSessions.findIndex(x => x.id === object.id);
    //             if (idx === -1) {
    //                 const session = object as ProgramSession;
    //                 if (session.trackId === props.track.id) {
    //                     newSessions.push(object as ProgramSession);
    //                 }
    //             }
    //             else {
    //                 newSessions.splice(idx, 1, object as ProgramSession);
    //             }
    //         }
    //         return newSessions;
    //     });
    // }, [props.track.id]);

    // const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
    //     setSessions(oldSessions => oldSessions?.filter(x => x.id !== ev.objectId) ?? null);
    // }, []);

    // useDataSubscription("ProgramSession",
    //     !!props.data ? null : onSessionUpdated,
    //     !!props.data ? null : onSessionDeleted,
    //     !sessions, conference);

    // const rows: Array<JSX.Element> = [];
    // const sessionEntries
    //     = sessions
    //         // ?.sort((x, y) => {
    //         //     return x.startTime < y.startTime ? -1
    //         //         : x.startTime === y.startTime ? 0
    //         //             : 1;
    //         // })
    //         ?? [];

    // for (const session of sessionEntries) {
    //     rows.push(<SessionGroup key={session.id} session={session} data={props.data} />);
    // }

    // if (items && items.length > 0) {
    //     if (sessionEntries.length > 0) {
    //         rows.push(<hr key="unscheduled-divider" />);
    //         const _rows: Array<JSX.Element> = [];
    //         for (const item of items.sort((x, y) => x.title.localeCompare(y.title))) {
    //             _rows.push(<Item key={item.id} item={item} clickable={true} data={props.data} />);
    //         }
    //         rows.push(<div key="unscheduled-items" className="session">
    //             <h2 className="title">Unscheduled items</h2>
    //             <div className="content">
    //                 {_rows}
    //             </div>
    //         </div>);
    //     }
    //     else {
    //         for (const item of items.sort((x, y) => x.title.localeCompare(y.title))) {
    //             rows.push(<Item key={item.id} item={item} clickable={true} data={props.data} />);
    //         }
    //     }
    // }

    // if (rows.length === 0) {
    //     rows.push(<div key="empty" className="session"><h2 className="title">This track contains no sessions.</h2></div>);
    // }

    // return <div className="track">
    //     <h2 className="title">
    //         <TrackMarker track={props.track} small={true} />
    //         <Link to={`/track/${props.track.id}`}>{props.track.name}</Link>
    //     </h2>
    //     <div className="content">
    //         {sessions && items ? rows : <LoadingSpinner />}
    //     </div>
    // </div>;
    return <></>;
}
