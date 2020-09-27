import React, { useCallback, useState } from "react";
import { ProgramSessionEvent, ProgramSession } from "clowdr-db-schema/src/classes/DataLayer";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "clowdr-db-schema/src/classes/DataLayer/Cache/Cache";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import EventItem from "./EventItem";
import { Link } from "react-router-dom";

interface Props {
    session: ProgramSession;
}

export default function SessionGroup(props: Props) {
    const conference = useConference();
    const [events, setEvents] = useState<Array<ProgramSessionEvent> | null>(null);

    // Fetch data
    useSafeAsync(async () => await props.session.events, setEvents, [props.session]);

    // Subscribe to changes
    const onSessionEventUpdated = useCallback(function _onEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        const newEvents = Array.from(events ?? []);
        const idx = newEvents.findIndex(x => x.id === ev.object.id);
        if (idx === -1) {
            const sessionevent = ev.object as ProgramSessionEvent;
            if (sessionevent.sessionId === props.session.id) {
                newEvents.push(ev.object as ProgramSessionEvent);
                setEvents(newEvents);
            }
        }
        else {
            newEvents.splice(idx, 1, ev.object as ProgramSessionEvent)
            setEvents(newEvents);
        }
    }, [props.session.id, events]);

    const onSessionEventDeleted = useCallback(function _onEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
        if (events) {
            setEvents(events.filter(x => x.id !== ev.objectId));
        }
    }, [events]);

    useDataSubscription("ProgramSessionEvent", onSessionEventUpdated, onSessionEventDeleted, !events, conference);

    const rows: Array<JSX.Element> = [];
    const eventEntries
        = events
            ? events.sort((x, y) => {
                return x.startTime < y.startTime ? -1
                    : x.startTime === y.startTime ? 0
                        : 1;
            })
            : [];

    for (const event of eventEntries) {
        rows.push(<EventItem key={event.id} event={event} />);
    }

    function daysIntoYear(date: Date) {
        return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
    }

    function fmtDate(date: Date) {
        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "numeric"
        });
    }

    const title =
        (daysIntoYear(props.session.startTime) !== daysIntoYear(props.session.endTime)
            ? `${fmtDate(props.session.startTime)} - ${fmtDate(props.session.endTime)}`
            : `${fmtDate(props.session.startTime)}`)
        + ` - ${props.session.title}`;

    return <div className="session">
        <h2 className="title">
            <Link to={`/session/${props.session.id}`}>
                {title}
            </Link>
        </h2>
        <div className="content">
            {rows}
        </div>
    </div>;
}
