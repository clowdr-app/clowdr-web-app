import React, { useMemo } from 'react';
// import { daysIntoYear } from "../../../../classes/Utils";
import { SortedEventData, SortedSessionData, WholeProgramData } from "../WholeProgramData";
import SessionGroup from "./SessionGroup";
import assert from 'assert';

interface Props {
    data: WholeProgramData;
}

export default function StreamsView(props: Props) {
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
                        assert(item, `Item ${event.itemId} not found! (Event: ${event.id}, Session: ${session.id})`);
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
            }).filter(x => x.eventsOfSession.length > 0 && x.feed && (x.feed.youtubeId || x.feed.zoomRoomId));

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
    const zoomToYoutubeMapping = new Map<string, string>();
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

                if (session.feed.zoomRoomId) {
                    if (!zoomToYoutubeMapping.has(session.feed.zoomRoomId)) {
                        zoomToYoutubeMapping.set(session.feed.zoomRoomId, session.feed.youtubeId);
                    }
                }
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

    for (const groupKey in groups) {
        if (groupKey in groups) {
            const mapping = zoomToYoutubeMapping.get(groupKey);
            if (mapping) {
                const zoomSessions = groups[groupKey];
                delete groups[groupKey];
                const youtubeSessions = groups[mapping];
                youtubeSessions.sessions = youtubeSessions.sessions.concat(zoomSessions.sessions);
                youtubeSessions.sessions = youtubeSessions.sessions.sort((x, y) => {
                    return x.earliestStart < y.earliestStart ? -1
                        : x.earliestStart === y.earliestStart ? 0
                            : 1;
                });
            }
        }
    }

    const rows: JSX.Element[] = [];
    const sortedGroups = Object.values(groups)
        .sort((x, y) => {
            if (x.id === "<!>NO_FEED<!>") {
                return 1;
            }
            else if (y.id === "<!>NO_FEED<!>") {
                return -1;
            }
            return 0;
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

    return <div className="tracks">
        {rows}
    </div>;
}
