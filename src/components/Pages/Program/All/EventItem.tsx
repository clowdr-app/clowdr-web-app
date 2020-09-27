import React, { useCallback, useState } from "react";
import { ProgramSessionEvent, ProgramItem } from "clowdr-db-schema/src/classes/DataLayer";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "clowdr-db-schema/src/classes/DataLayer/Cache/Cache";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { Link } from "react-router-dom";

interface Props {
    event: ProgramSessionEvent;
}

export default function EventItem(props: Props) {
    const conference = useConference();
    const [item, setItem] = useState<ProgramItem | null>(null);

    // Fetch data
    useSafeAsync(async () => await props.event.item, setItem, [props.event]);

    // Subscribe to changes
    const onItemUpdated = useCallback(function _onItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        if (!item || ev.object.id === item.id) {
            setItem(ev.object as ProgramItem);
        }
    }, [item]);

    const onItemDeleted = useCallback(function _onItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        setItem(null)
    }, []);

    useDataSubscription("ProgramItem", onItemUpdated, onItemDeleted, false, conference);

    function fmtTime(date: Date) {
        return date.toLocaleTimeString(undefined, {
            hour12: false,
            hour: "numeric",
            minute: "numeric"
        });
    }

    return <Link className="event" to={`/event/${props.event.id}`}>
        <h2 className="title">
            {fmtTime(props.event.startTime)} - {fmtTime(props.event.endTime)}
        </h2>
        <div className="content">
            {item ? item.title : <LoadingSpinner />}
        </div>
    </Link>;
}
