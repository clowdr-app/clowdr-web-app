import React, { useMemo } from 'react';
// import { daysIntoYear } from "../../../../classes/Utils";
import { SortedEventData, SortedSessionData, WholeProgramData } from "../WholeProgramData";
import SessionGroup from "./SessionGroup";
import assert from 'assert';

interface Props {
    data: WholeProgramData;
}

export default function ScheduleView(props: Props) {
    // const dayRows: Array<JSX.Element> = [];
    const sessions = props.data.sessions;

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
                    feed: props.data.feeds?.find(feed => feed.id === session.feedId),
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
            }).filter(x => x.eventsOfSession.length > 0
                // TODO: SPLASH: Do we need this?: && x.feed && (x.feed.textChatId || x.feed.videoRoomId || x.feed.youtubeId || x.feed.zoomRoomId)
            );

            return sessionsWithTimes.sort((x, y) => {
                return x.earliestStart < y.earliestStart ? -1
                    : x.earliestStart === y.earliestStart ? 0
                        : 1;
            });
        }

        return [];
    }, [props.data.authors, props.data.events, props.data.feeds, props.data.items, sessions]);

    const groups: {
        [k: string]: {
            id: string;
            sessions: Array<SortedSessionData>;
        }
    } = {};
    for (const session of sortedSessions) {
        let group;
        if (session.feed) {
            if (session.feed.youtubeId) {
                if (!groups[session.feed.youtubeId]) {
                    groups[session.feed.youtubeId] = {
                        id: session.feed.youtubeId,
                        sessions: [],
                    }
                }
                group = groups[session.feed.youtubeId];
            }
            else if (session.feed.zoomRoomId) {
                if (!groups[session.feed.zoomRoomId]) {
                    groups[session.feed.zoomRoomId] = {
                        id: session.feed.zoomRoomId,
                        sessions: [],
                    }
                }
                group = groups[session.feed.zoomRoomId];
            }
        }

        if (!group) {
            if (!groups["<!>NO_FEED<!>"]) {
                groups["<!>NO_FEED<!>"] = {
                    id: "<!>NO_FEED<!>",
                    sessions: []
                };
            }
            group = groups["<!>NO_FEED<!>"];
        }

        if (group) {
            group.sessions.push(session);
        }
    }

    // Should look similar to https://2020.splashcon.org/program/program-splash-2020

    const rows: JSX.Element[] = [];
    // let prevEventDay: number | null = null;
    // for (const session of sortedSessions) {
    //     const currEventDay = daysIntoYear(session.earliestStart);
    //     if (prevEventDay !== currEventDay) {
    //         rows.push(<hr key={"hr-" + currEventDay} />);
    //         if (prevEventDay) {
    //             rows.push(
    //                 // eslint-disable-next-line jsx-a11y/anchor-has-content,jsx-a11y/anchor-is-valid
    //                 <a className="back-to-top" key={currEventDay} id={fmtDateForLink(session.earliestStart)} href="#day-selector">Back to top</a>
    //             );
    //         }
    //     }
    //     rows.push(
    //         <SessionGroup session={session} key={session.session.id} hideEventTimes={false} showSessionTime={true} />
    //     );
    //     prevEventDay = currEventDay;
    // }

    const sortedGroups = Object.values(groups)
        .sort((x, y) => {
            if (x.id === "<!>NO_FEED<!>") {
                return 1;
            }
            else if (y.id === "<!>NO_FEED<!>") {
                return -1;
            }
            return 0; // x.name.localeCompare(y.name)
        });
    for (const group of sortedGroups) {
        const items: JSX.Element[] = [];
        for (const session of group.sessions) {
            items.push(<SessionGroup session={session} key={session.session.id} hideEventTimes={false} showSessionTime={true} />);
        }
        rows.push(<div className="track">
            <div className="content">
                {items}
            </div>
        </div>);
    }

    // function fmtDateForLink(date: Date) {
    //     return "day_" + date.toLocaleDateString().replace(/\//g, "_");
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
    //     const dayCount = lastDay < firstDay ? lastDay + (daysIntoYear(new Date(firstDate.getFullYear(), 11, 31)) - firstDay) + 1 : (lastDay - firstDay) + 1;
    //     const firstTime = firstDate.getTime();
    //     const hr24 = 24 * 60 * 60 * 1000;
    //     for (let dayIdx = 0; dayIdx < dayCount; dayIdx++) {
    //         const dayDate = new Date(firstTime + (dayIdx * hr24));
    //         dayRows.push(<div className="day" key={dayIdx}>
    //             <a href={`#${fmtDateForLink(dayDate)}`} className="button">{fmtDate(dayDate)}</a>
    //         </div>);
    //     }
    // }

    return <div className="tracks">
        {rows}
    </div>;
    // return <div className="schedule-wrapper">
    //     <div className="days" id="day-selector">
    //         {dayRows}
    //     </div>
    //     <div className="schedule">
    //         {rows}
    //     </div>
    // </div>;
}
