import React from "react";
import EventItem from "./EventItem";
import { Link } from "react-router-dom";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { daysIntoYear } from "../../../../classes/Utils";
import { SortedSessionData } from "../WholeProgramData";

interface Props {
    session: SortedSessionData;

    overrideTitle?: string;
    includeEvents?: string[] | undefined;
    showSessionTime?: boolean;
    hideEventTimes?: boolean;
    eventsLinkToSession?: boolean;
}

export default function SessionGroup(props: Props) {
    let events;
    if (props.includeEvents) {
        const includeEventIds = props.includeEvents;
        events = props.session.eventsOfSession.filter(x => includeEventIds.includes(x.event.id));
    }
    else {
        events = props.session.eventsOfSession;
    }

    const rows: Array<JSX.Element> = [];

    for (const event of events) {
        rows.push(<EventItem
            key={event.event.id}
            event={event}
            hideEventTime={props.hideEventTimes}
            eventsLinkToSession={props.eventsLinkToSession}
        />);
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

    const startDay = daysIntoYear(props.session.earliestStart);
    const endDay = daysIntoYear(props.session.latestEnd);
    const isSameDay = startDay === endDay;
    const startTimeStr = fmtDate(props.session.earliestStart) + (props.showSessionTime ? " " + fmtTime(props.session.earliestStart) : "");
    const endTimeStr = (!isSameDay ? fmtDate(props.session.latestEnd) : "") + (props.showSessionTime ? " " + fmtTime(props.session.latestEnd) : "");
    const title =
        <>
            {props.showSessionTime || !isSameDay ? `${startTimeStr} - ${endTimeStr}` : `${startTimeStr}`}
            &nbsp;&middot;&nbsp;
            {props.session.session.title}
        </>;

    if (rows.length === 0) {
        rows.push(<div key="empty" className="event disabled"><div className="heading"><h2 className="title">This session contains no events.</h2></div></div>);
    }

    return <div className={`session${props.eventsLinkToSession ? " eventsLinkToSession" : ""}`}>
        <h2 className={`title${props.showSessionTime ? " left-align" : ""}`}>
            {props.overrideTitle
                ? props.overrideTitle
                : <Link to={`/session/${props.session.session.id}`}>
                    {title}
                </Link>
            }
        </h2>
        <div className="content">
            {events ? rows : <LoadingSpinner />}
        </div>
    </div>;
}
