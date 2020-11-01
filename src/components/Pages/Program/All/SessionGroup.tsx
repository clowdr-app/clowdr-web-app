import React, { useCallback, useState } from "react";
import { ProgramSessionEvent, ProgramSession } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import EventItem from "./EventItem";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { daysIntoYear } from "../../../../classes/Utils";
import { WholeProgramData } from "../WholeProgramData";

interface Props {
    session: ProgramSession;
    data?: WholeProgramData;
    overrideTitle?: string;
    includeEvents?: string[] | undefined;
    showSessionTime?: boolean;
    hideEventTimes?: boolean;
    style?: React.CSSProperties;
}

export default function SessionGroup(props: Props) {
    const conference = useConference();
    const [events, setEvents] = useState<Array<ProgramSessionEvent> | null>(props.data?.events.filter(x => x.sessionId === props.session.id) ?? null);

    // Fetch data
    useSafeAsync(async () => events ?? await props.session.events,
        setEvents,
        [props.session.id, props.data?.events]);

    // Subscribe to changes
    const onSessionEventUpdated = useCallback(function _onEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        setEvents(oldEvents => {
            const newEvents = Array.from(oldEvents ?? []);
            for (const object of ev.objects) {
                const idx = newEvents.findIndex(x => x.id === object.id);
                if (idx === -1) {
                    const event = object as ProgramSessionEvent;
                    if (event.sessionId === props.session.id) {
                        newEvents.push(object as ProgramSessionEvent);
                    }
                }
                else {
                    newEvents.splice(idx, 1, object as ProgramSessionEvent)
                }
            }
            return newEvents;
        });
    }, [props.session.id]);

    const onSessionEventDeleted = useCallback(function _onEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
        setEvents(oldEvents => oldEvents?.filter(x => x.id !== ev.objectId) ?? null);
    }, []);

    useDataSubscription("ProgramSessionEvent",
        !!props.data ? null : onSessionEventUpdated,
        !!props.data ? null : onSessionEventDeleted,
        !events, conference);

    const rows: Array<JSX.Element> = [];
    const eventEntries
        = events
            ? events.sort((x, y) => {
                return x.startTime < y.startTime ? -1
                    : x.startTime === y.startTime ? 0
                        : 1;
            })
            : [];

    const earliestStart = eventEntries.reduce((r, e) => r.getTime() < e.startTime.getTime() ? r : e.startTime, new Date(32503680000000));
    const latestEnd = eventEntries.reduce((r, e) => r.getTime() > e.endTime.getTime() ? r : e.endTime, new Date(0));

    for (const event of eventEntries) {
        if (!props.includeEvents || props.includeEvents.includes(event.id)) {
            rows.push(<EventItem key={event.id} event={event} data={props.data} hideEventTime={props.hideEventTimes} />);
        }
    }

    function fmtDate(date: Date) {
        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short"
        });
    }

    function fmtTime(date: Date) {
        return date.toLocaleTimeString(undefined, {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    const startDay = daysIntoYear(earliestStart);
    const endDay = daysIntoYear(latestEnd);
    const isSameDay = startDay === endDay;
    const startTimeStr = fmtDate(earliestStart) + (props.showSessionTime ? " " + fmtTime(earliestStart) : "");
    const endTimeStr = (!isSameDay ? fmtDate(latestEnd) : "") + (props.showSessionTime ? " " + fmtTime(latestEnd) : "");
    const title =
        <>
            {props.showSessionTime || !isSameDay ? `${startTimeStr} - ${endTimeStr}` : `${startTimeStr}`}
            &nbsp;&middot;&nbsp;
            {props.session.title}
        </>;

    if (rows.length === 0) {
        rows.push(<div key="empty" className="event disabled"><div className="heading"><h2 className="title">This session contains no events.</h2></div></div>);
    }

    return <div className="session" style={props.style}>
        <h2 className={`title${props.showSessionTime ? " left-align" : ""}`}>
            {props.overrideTitle
                ? props.overrideTitle
                : <Link to={`/session/${props.session.id}`}>
                    {title}
                </Link>
            }
        </h2>
        <div className="content">
            {events ? rows : <LoadingSpinner />}
        </div>
    </div>;
}
