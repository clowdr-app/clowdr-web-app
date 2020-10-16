import React, { } from "react";
import { daysIntoYear } from "../../../../classes/Utils";
import { WholeProgramData } from "../WholeProgramData";
import SessionGroup from "./SessionGroup";

interface Props {
    data: WholeProgramData;
}

export default function ScheduleView(props: Props) {
    const rows: Array<JSX.Element> = [];
    const dayRows: Array<JSX.Element> = [];
    // const tracks = props.data.tracks;
    const sessions = props.data.sessions;
    // const events = props.data.events;

    // Old totally flat view
    // if (sessions && events) {
    //     const sortedEvents = events.sort((x, y) => {
    //         return x.startTime < y.startTime ? -1
    //             : x.startTime === y.startTime ? 0
    //                 : 1;
    //     });
    //     let prevEventDay: number | null = null;
    //     for (const event of sortedEvents) {
    //         const session = sessions.find(x => x.id === event.sessionId);
    //         const track = session ? tracks.find(x => x.id === session.trackId) : undefined;
    //         const currEventDay = daysIntoYear(event.startTime);
    //         if (prevEventDay && prevEventDay !== currEventDay) {
    //             rows.push(<hr key={currEventDay} />);
    //         }
    //         rows.push(
    //             <EventItem
    //                 key={event.id}
    //                 event={event}
    //                 session={session}
    //                 track={track}
    //                 data={props.data}
    //             />);
    //         prevEventDay = currEventDay;
    //     }

    //     if (rows.length === 0) {
    //         rows.push(<div key="empty">There are no tracks in this program.</div>);
    //     }
    // }

    if (sessions) {
        let prevEventDay: number | null = null;
        const sortedSessions
            = sessions.sort((x, y) => {
                return x.startTime < y.startTime ? -1
                    : x.startTime === y.startTime ? 0
                        : 1;
            });
        function fmtDateForLink(date: Date) {
            return "day_" + date.toLocaleDateString().replace(/\//g, "_");
        }

        for (const session of sortedSessions) {
            const currEventDay = daysIntoYear(session.startTime);
            if (prevEventDay !== currEventDay) {
                rows.push(<hr key={"hr-" + currEventDay} />);
                if (prevEventDay) {
                    rows.push(
                        // eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid
                        <a className="back-to-top" key={currEventDay} id={fmtDateForLink(session.startTime)} href="#day-selector">Back to top</a>
                    );
                }
            }
            rows.push(
                <SessionGroup session={session} data={props.data} key={session.id} hideEventTimes={true} showSessionTime={true} />
            );
            prevEventDay = currEventDay;
        }
        if (sortedSessions.length > 0) {
            function fmtDate(date: Date) {
                return date.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short"
                });
            }

            const firstDate = sortedSessions[0].startTime;
            const lastDate = sortedSessions[sortedSessions.length - 1].startTime;
            const firstDay = daysIntoYear(firstDate);
            const lastDay = daysIntoYear(lastDate);
            const dayCount = (lastDay - firstDay) + 1;
            const firstTime = firstDate.getTime();
            const hr24 = 24 * 60 * 60 * 1000;
            for (let dayIdx = 0; dayIdx < dayCount; dayIdx++) {
                const dayDate = new Date(firstTime + (dayIdx * hr24));
                dayRows.push(<div className="day" key={dayIdx}>
                    <a href={`#${fmtDateForLink(dayDate)}`} className="button">{fmtDate(dayDate)}</a>
                </div>);
            }
        }
    }

    return <div className="schedule-wrapper">
        <div className="days" id="day-selector">
            {dayRows}
        </div>
        <div className="schedule">
            {rows}
        </div>
    </div>;
}
