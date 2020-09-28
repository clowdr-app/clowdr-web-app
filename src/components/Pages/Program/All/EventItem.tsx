import React, { useCallback, useState } from "react";
import { ProgramPerson, ProgramItem, ProgramSessionEvent, ProgramSession, ProgramTrack } from "@clowdr-app/clowdr-db-schema/build/DataLayer";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { Link, useHistory } from "react-router-dom";
import AuthorsList from "../AuthorsList";

interface Props {
    event: ProgramSessionEvent;
    session?: ProgramSession;
    track?: ProgramTrack;
}

export default function EventItem(props: Props) {
    const conference = useConference();
    const [item, setItem] = useState<ProgramItem | null>(null);
    const [authors, setAuthors] = useState<Array<ProgramPerson> | null>(null);
    const history = useHistory();

    // Fetch data
    useSafeAsync(async () => await props.event.item, setItem, [props.event]);
    useSafeAsync(async () => item ? await item.authors : null, setAuthors, [item]);

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
        <div className="content">
            <div className="abstract">{item ? item.title : <LoadingSpinner />}</div>
            <AuthorsList authors={authors} />
        </div>
    </div>;
}
