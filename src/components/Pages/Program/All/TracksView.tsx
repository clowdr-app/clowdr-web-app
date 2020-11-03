import React, { useMemo } from 'react';
import assert from 'assert';
import { SortedEventData, SortedSessionData, WholeProgramData } from '../WholeProgramData';
import TrackColumn from './TrackColumn';

interface Props {
    data: WholeProgramData;
}

export default function TracksView(props: Props) {
    const data = props.data;

    const columns: Array<JSX.Element> = useMemo(() => {
        let _columns: Array<JSX.Element> = [];
        // TODO: What a collosal hack - this is supposed to be encoded by a "priority" column on tracks
        //       in the database
        const CSCW_TRACK_ORDERING = [
            "Keynotes",
            "Papers",
            "Panels",
            "Special Events",
            "Posters",
            "Demos",
            "Doctoral Consortium",
            "Workshops",
            "UIST Papers",
        ];
        _columns
            = data.tracks
                .sort((x, y) => {
                    const xIdx = CSCW_TRACK_ORDERING.indexOf(x.name);
                    const yIdx = CSCW_TRACK_ORDERING.indexOf(y.name);
                    return xIdx < yIdx ? -1 : xIdx === yIdx ? 0 : 1;
                })
            .map(track => {
                const sessions = data.sessions.filter(x => x.trackId === track.id);
                const sessionsWithTimes: SortedSessionData[] = sessions.map(session => {
                    const eventsOfSession = data.events.filter(event => event.sessionId === session.id);
                    const earliestStart = eventsOfSession?.reduce((r, e) => r.getTime() < e.startTime.getTime() ? r : e.startTime, new Date(32503680000000));
                    const latestEnd = eventsOfSession?.reduce((r, e) => r.getTime() > e.endTime.getTime() ? r : e.endTime, new Date(0));
                    const sResult: SortedSessionData = {
                        session,
                        earliestStart,
                        latestEnd,
                        eventsOfSession: eventsOfSession.map(event => {
                            const item = data.items.find(x => x.id === event.itemId);
                            assert(item);
                            const eResult: SortedEventData = {
                                event,
                                item: {
                                    item,
                                    authors: data.authors.filter(x => item.authors.includes(x.id)),
                                    eventsForItem: data.events.filter(x => x.itemId === item.id)
                                }
                            };
                            return eResult;
                        }).sort((x, y) =>
                            x.event.startTime < y.event.startTime ? -1
                                : x.event.startTime === y.event.startTime ? 0
                                    : 1)
                    };
                    return sResult;
                });

                return <TrackColumn key={track.id} track={{
                    track,
                    sessionsOfTrack: sessionsWithTimes.sort((x, y) => {
                        return x.earliestStart < y.earliestStart ? -1
                            : x.earliestStart === y.earliestStart ? 0
                                : 1;
                    }),
                    itemsOfTrack: data.items
                        .filter(x => x.trackId === track.id && !data.events.some(y => y.itemId === x.id))
                        .map(item => ({
                            item,
                            authors: data.authors.filter(x => item.authors.includes(x.id)),
                            eventsForItem: data.events.filter(x => x.itemId === item.id)
                        }))
                }} />
            });

        if (_columns.length === 0) {
            _columns.push(<div key="empty">There are no tracks in this program.</div>);
        }
        return _columns;
    }, [data.events, data.items, data.sessions, data.tracks, data.authors]);

    return <div className="tracks">
        {columns}
    </div>;
}
