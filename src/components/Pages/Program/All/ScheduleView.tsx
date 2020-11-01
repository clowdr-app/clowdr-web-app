import React, { useMemo } from "react";
import { daysIntoYear } from "../../../../classes/Utils";
import { WholeProgramData } from "../WholeProgramData";
import SessionGroup from "./SessionGroup";
import { VariableSizeList as List } from 'react-window';
import AutoSizer from "react-virtualized-auto-sizer";

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

    const sortedSessions = useMemo(() => {
        if (sessions) {
            const sessionsWithTimes = sessions.map(session => {
                const eventsOfSession = props.data.events.filter(event => event.sessionId === session.id);
                const earliestStart = eventsOfSession?.reduce((r, e) => r.getTime() < e.startTime.getTime() ? r : e.startTime, new Date(32503680000000));
                const latestEnd = eventsOfSession?.reduce((r, e) => r.getTime() > e.endTime.getTime() ? r : e.endTime, new Date(0));
                return {
                    session,
                    earliestStart,
                    latestEnd,
                    eventsOfSession
                };
            });

            return sessionsWithTimes.sort((x, y) => {
                    return x.earliestStart < y.earliestStart ? -1
                        : x.earliestStart === y.earliestStart ? 0
                            : 1;
                });
        }

        return [];
    }, [props.data.events, sessions]);


    function fmtDateForLink(date: Date) {
        return "day_" + date.toLocaleDateString().replace(/\//g, "_");
    }

    // let prevEventDay: number | null = null;
    // for (const session of sortedSessions) {
    //     
    //     prevEventDay = currEventDay;
    // }

    // if (sortedSessions.length > 0) {
    //     function fmtDate(date: Date) {
    //         return date.toLocaleDateString(undefined, {
    //             day: "numeric",
    //             month: "short"
    //         });
    //     }

    //     const firstDate = sortedSessions[0].earliestStart;
    //     const lastDate = sortedSessions[sortedSessions.length - 1].earliestStart;
    //     const firstDay = daysIntoYear(firstDate);
    //     const lastDay = daysIntoYear(lastDate);
    //     const dayCount = (lastDay - firstDay) + 1;
    //     const firstTime = firstDate.getTime();
    //     const hr24 = 24 * 60 * 60 * 1000;
    //     for (let dayIdx = 0; dayIdx < dayCount; dayIdx++) {
    //         const dayDate = new Date(firstTime + (dayIdx * hr24));
    //         dayRows.push(<div className="day" key={dayIdx}>
    //             <a href={`#${fmtDateForLink(dayDate)}`} className="button">{fmtDate(dayDate)}</a>
    //         </div>);
    //     }
    // }

    const getItemSize = (index: number) => {
        const { eventsOfSession } = sortedSessions[index];
        return 50 + (eventsOfSession.length * 92);
    };

    const renderItem = ({ index, style }: {
        index: number,
        style: React.CSSProperties
    }) => {
        const { session } = sortedSessions[index];
        return <SessionGroup style={style} session={session} data={props.data} key={session.id} hideEventTimes={false} showSessionTime={true} />;
    };

    return <div className="schedule-wrapper">
        <div className="days" id="day-selector">
            {dayRows}
        </div>
        <div className="schedule">
            <AutoSizer>
                {({ width, height }) => (
                    <List
                        height={height}
                        itemCount={sessions.length}
                        itemSize={getItemSize}
                        width={width}
                    >
                        {renderItem}
                    </List>
                )}
            </AutoSizer>
        </div>
    </div>;
}
