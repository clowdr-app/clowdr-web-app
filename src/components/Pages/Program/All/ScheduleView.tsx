import React, { useMemo } from 'react';
import { daysIntoYear } from "../../../../classes/Utils";
import { SortedEventData, SortedSessionData, WholeProgramData } from "../WholeProgramData";
import SessionGroup from "./SessionGroup";
import assert from 'assert';

interface Props {
    data: WholeProgramData;
}

export default function ScheduleView(props: Props) {
    const dayRows: Array<JSX.Element> = [];
    const sessions = props.data.sessions;

    // TODO: Group into columns based on content feeds sharing the same zoom/youtube source(s)

    const sortedSessions: SortedSessionData[] = useMemo(() => {
        if (sessions) {
            const sessionsWithTimes: SortedSessionData[] = sessions.map(session => {
                const eventsOfSession = props.data.events.filter(event => event.sessionId === session.id);
                const earliestStart = eventsOfSession?.reduce((r, e) => r.getTime() < e.startTime.getTime() ? r : e.startTime, new Date(32503680000000));
                const latestEnd = eventsOfSession?.reduce((r, e) => r.getTime() > e.endTime.getTime() ? r : e.endTime, new Date(0));
                const sResult: SortedSessionData = {
                    session,
                    earliestStart,
                    latestEnd,
                    eventsOfSession: eventsOfSession.map(event => {
                        const item = props.data.items.find(x => x.id === event.itemId);
                        assert(item);
                        const eResult: SortedEventData = {
                            event,
                            item: {
                                item,
                                authors: props.data.authors.filter(x => item.authors.includes(x.id)),
                                eventsForItem: props.data.events.filter(x => x.itemId === item.id)
                            }
                        };
                        return eResult;
                    }).sort((x, y) =>
                        x.event.startTime < y.event.startTime ? -1
                            : x.event.startTime === y.event.startTime ? 0
                                : 1)
                };
                return sResult;
            }).filter(x => x.eventsOfSession.length > 0);

            // events

            return sessionsWithTimes.sort((x, y) => {
                return x.earliestStart < y.earliestStart ? -1
                    : x.earliestStart === y.earliestStart ? 0
                        : 1;
            });
        }

        return [];
    }, [props.data.authors, props.data.events, props.data.items, sessions]);


    const rows: JSX.Element[] = [];
    let prevEventDay: number | null = null;
    for (const session of sortedSessions) {
        const currEventDay = daysIntoYear(session.earliestStart);
        if (prevEventDay !== currEventDay) {
            rows.push(<hr key={"hr-" + currEventDay} />);
            if (prevEventDay) {
                rows.push(
                    // eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid
                    <a className="back-to-top" key={currEventDay} id={fmtDateForLink(session.earliestStart)} href="#day-selector">Back to top</a>
                );
            }
        }
        rows.push(
            <SessionGroup session={session} key={session.session.id} hideEventTimes={false} showSessionTime={true} />
        );
        prevEventDay = currEventDay;
    }

    function fmtDateForLink(date: Date) {
        return "day_" + date.toLocaleDateString().replace(/\//g, "_");
    }

    if (sortedSessions.length > 0) {
        function fmtDate(date: Date) {
            return date.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short"
            });
        }

        const firstDate = sortedSessions[0].earliestStart;
        const lastDate = sortedSessions[sortedSessions.length - 1].earliestStart;
        const firstDay = daysIntoYear(firstDate);
        const lastDay = daysIntoYear(lastDate);
        const dayCount = lastDay < firstDay ? lastDay + (daysIntoYear(new Date(firstDate.getFullYear(), 11, 31)) - firstDay) + 1 : (lastDay - firstDay) + 1;
        const firstTime = firstDate.getTime();
        const hr24 = 24 * 60 * 60 * 1000;
        for (let dayIdx = 0; dayIdx < dayCount; dayIdx++) {
            const dayDate = new Date(firstTime + (dayIdx * hr24));
            dayRows.push(<div className="day" key={dayIdx}>
                <a href={`#${fmtDateForLink(dayDate)}`} className="button">{fmtDate(dayDate)}</a>
            </div>);
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
