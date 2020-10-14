import React, {  } from "react";
import { daysIntoYear } from "../../../../classes/Utils";
import EventItem from "./EventItem";
import { WholeProgramData } from "./WholeProgram";

interface Props {
    data: WholeProgramData;
}

export default function ScheduleView(props: Props) {
    const rows: Array<JSX.Element> = [];
    const tracks = props.data.tracks;
    const sessions = props.data.sessions;
    const events = props.data.events;

    if (sessions && events) {
        const sortedEvents = events.sort((x, y) => {
            return x.startTime < y.startTime ? -1
                : x.startTime === y.startTime ? 0
                    : 1;
        });
        let prevEventDay: number | null = null;
        for (const event of sortedEvents) {
            const session = sessions.find(x => x.id === event.sessionId);
            const track = session ? tracks.find(x => x.id === session.trackId) : undefined;
            const currEventDay = daysIntoYear(event.startTime);
            if (prevEventDay && prevEventDay !== currEventDay) {
                rows.push(<hr key={currEventDay} />);
            }
            rows.push(
                <EventItem
                    key={event.id}
                    event={event}
                    session={session}
                    track={track}
                    data={props.data}
                />);
            prevEventDay = currEventDay;
        }

        if (rows.length === 0) {
            rows.push(<div key="empty">There are no tracks in this program.</div>);
        }
    }

    return <>{rows}</>;
}
