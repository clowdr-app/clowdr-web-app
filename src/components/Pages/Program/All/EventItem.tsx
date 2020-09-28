import React, { useCallback, useState } from "react";
import { ProgramPerson, ProgramItem, ProgramSessionEvent } from "clowdr-db-schema/src/classes/DataLayer";
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
    const [authors, setAuthors] = useState<Array<ProgramPerson> | null>(null);

    // Fetch data
    useSafeAsync(async () => await props.event.item, setItem, [props.event]);
    useSafeAsync(async () => item ? await item.authors : null, setAuthors, [item, props.event]);

    // Subscribe to changes
    const onItemUpdated = useCallback(function _onItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        if (!item || ev.object.id === item.id) {
            setItem(ev.object as ProgramItem);
        }
    }, [item]);

    const onItemDeleted = useCallback(function _onItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        setItem(null)
    }, []);

    const onAuthorUpdated = useCallback(function _onAuthorUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
        const newAuthors = Array.from(authors ?? []);
        const idx = newAuthors.findIndex(x => x.id === ev.object.id);
        if (idx > -1) {
            newAuthors.splice(idx, 1, ev.object as ProgramPerson)
            setAuthors(newAuthors);
        }
    }, [authors]);

    const onAuthorDeleted = useCallback(function _onAuthorDeleted(ev: DataDeletedEventDetails<"ProgramPerson">) {
        if (authors) {
            setAuthors(authors.filter(x => x.id !== ev.objectId));
        }
    }, [authors]);

    useDataSubscription("ProgramPerson", onAuthorUpdated, onAuthorDeleted, !authors, conference);
    useDataSubscription("ProgramItem", onItemUpdated, onItemDeleted, !item, conference);

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
            <div className="abstract">{item ? item.title : <LoadingSpinner />}</div>
            <div className="authors">{authors?.reduce((acc, a) => `${acc}, ${a.name}`, "").substr(2)}</div>
        </div>
    </Link>;
}
