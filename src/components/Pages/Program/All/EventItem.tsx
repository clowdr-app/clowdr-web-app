import React, { useCallback, useState } from "react";
import { ProgramItem, ProgramSessionEvent, ProgramSession, ProgramTrack } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { Link, useHistory } from "react-router-dom";
import Item from "./Item";
import { WholeProgramData } from "../WholeProgramData";

interface Props {
    event: ProgramSessionEvent;
    data?: WholeProgramData;
    session?: ProgramSession;
    track?: ProgramTrack;
}

export default function EventItem(props: Props) {
    const conference = useConference();
    const [item, setItem] = useState<ProgramItem | null>(props.data?.items?.find(x => props.event.itemId === x.id) ?? null);
    const history = useHistory();

    // Fetch data
    useSafeAsync(
        async () => item ?? await props.event.item,
        setItem,
        [props.event.itemId, props.data?.items]);

    // Subscribe to changes
    const onItemUpdated = useCallback(function _onItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        setItem(oldItem => oldItem && ev.object.id === oldItem.id ? ev.object as ProgramItem : null);
    }, []);

    const onItemDeleted = useCallback(function _onItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        setItem(oldItem => oldItem && ev.objectId === oldItem.id ? null : oldItem)
    }, []);

    useDataSubscription("ProgramItem",
        props.data ? null : onItemUpdated,
        props.data ? null : onItemDeleted,
        !item, conference);

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
        tabIndex={0}
        onKeyPress={(ev) => {
            if (ev.key === "Enter") {
                ev.preventDefault();
                ev.stopPropagation();
                history.push(`/event/${props.event.id}`);
            }
        }}
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
            {props.session ? <Link
                className="session-info"
                to={`/session/${props.session.id}`}
                onClick={(ev) => {
                    ev.stopPropagation();
                }}
                onKeyPress={(ev) => {
                    if (ev.key === "Enter") {
                        ev.stopPropagation();
                    }
                }}
            >
                {props.session.title}
            </Link> : <></>}
            {props.track ? <Link
                className="track-info"
                to={`/track/${props.track.id}`}
                onClick={(ev) => {
                    ev.stopPropagation();
                }}
                onKeyPress={(ev) => {
                    if (ev.key === "Enter") {
                        ev.stopPropagation();
                    }
                }}
            >
                {props.track.name}
            </Link> : <></>}
        </div>
        {item ? <Item item={item} data={props.data} /> : <LoadingSpinner />}
    </div>;
}
