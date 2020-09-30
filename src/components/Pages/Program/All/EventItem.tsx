import React, { useCallback, useState } from "react";
import { ProgramItem, ProgramSessionEvent, ProgramSession, ProgramTrack } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { Link, useHistory } from "react-router-dom";
import Item from "./Item";

interface Props {
    event: ProgramSessionEvent;
    session?: ProgramSession;
    track?: ProgramTrack;
}

export default function EventItem(props: Props) {
    const conference = useConference();
    const [item, setItem] = useState<ProgramItem | null>(null);
    const history = useHistory();

    // Fetch data
    useSafeAsync(async () => await props.event.item, setItem, [props.event]);

    // Subscribe to changes
    const onItemUpdated = useCallback(function _onItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        if (item && ev.object.id === item.id) {
            setItem(ev.object as ProgramItem);
        }
    }, [item]);

    const onItemDeleted = useCallback(function _onItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        if (item && item.id === ev.objectId) {
            setItem(null)
        }
    }, [item]);

    useDataSubscription("ProgramItem", onItemUpdated, onItemDeleted, !item, conference);

    function fmtTime(date: Date) {
        return date.toLocaleTimeString(undefined, {
            hour12: false,
            hour: "numeric",
            minute: "numeric"
        });
    }

    function fmtDay(date: Date) {
        return date.toLocaleDateString(undefined, {
            weekday: "short"
        });
    }

    const now = new Date();
    const isNow = props.event.startTime < now && props.event.endTime > now;

    return <div
        className={`event${isNow ? " now" : ""}`}
        onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            history.push(`/event/${props.event.id}`);
        }}
    >
        <div className="heading">
            <h2 className="title">
                {fmtDay(props.event.startTime)} &middot; {fmtTime(props.event.startTime)} - {fmtTime(props.event.endTime)}
            </h2>
            {props.session ? <Link className="session-info" to={`/session/${props.session.id}`}>{props.session.title}</Link> : <></>}
            {props.track ? <Link className="track-info" to={`/track/${props.track.id}`}>{props.track.name}</Link> : <></>}
        </div>
        {item ? <Item item={item} /> : <LoadingSpinner />}
    </div>;
}
