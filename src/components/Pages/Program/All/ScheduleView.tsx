import { ProgramSession, ProgramSessionEvent, ProgramTrack } from "@clowdr-app/clowdr-db-schema/build/DataLayer";
import { DataUpdatedEventDetails, DataDeletedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useState } from "react";
import { daysIntoYear } from "../../../../classes/Utils";
import useConference from "../../../../hooks/useConference";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import EventItem from "./EventItem";

interface Props {
    tracks: Array<ProgramTrack>;
}

export default function ScheduleView(props: Props) {
    const conference = useConference();
    const [sessions, setSessions] = useState<Array<ProgramSession> | null>(null);
    const [events, setEvents] = useState<Array<ProgramSessionEvent> | null>(null);

    // Fetch data
    useSafeAsync(async () => await ProgramSession.getAll(conference.id), setSessions, [conference.id]);
    useSafeAsync(async () => await ProgramSessionEvent.getAll(conference.id), setEvents, [conference.id]);

    // Subscribe to changes
    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        const newSessions = Array.from(sessions ?? []);
        const idx = newSessions?.findIndex(x => x.id === ev.object.id);
        if (idx === -1) {
            newSessions.push(ev.object as ProgramSession);
        }
        else {
            newSessions.splice(idx, 1, ev.object as ProgramSession);
        }
        setSessions(newSessions);
    }, [sessions]);

    const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        if (sessions) {
            setSessions(sessions.filter(x => x.id === ev.objectId));
        }
    }, [sessions]);

    const onEventUpdated = useCallback(function _onEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        const newEvents = Array.from(events ?? []);
        const idx = newEvents?.findIndex(x => x.id === ev.object.id);
        if (idx === -1) {
            newEvents.push(ev.object as ProgramSessionEvent);
        }
        else {
            newEvents.splice(idx, 1, ev.object as ProgramSessionEvent);
        }
        setEvents(newEvents);
    }, [events]);

    const onEventDeleted = useCallback(function _onEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
        if (events) {
            setEvents(events.filter(x => x.id === ev.objectId));
        }
    }, [events]);

    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !sessions, conference);
    useDataSubscription("ProgramSessionEvent", onEventUpdated, onEventDeleted, !events, conference);

    const rows: Array<JSX.Element> = [];

    if (sessions && events) {
        const sortedEvents = events.sort((x, y) => {
            return x.startTime < y.startTime ? -1
                : x.startTime === y.startTime ? 0
                    : 1;
        });
        let prevEventDay: number | null = null;
        for (const event of sortedEvents) {
            const session = sessions.find(x => x.id === event.sessionId);
            const track = session ? props.tracks.find(x => x.id === session.trackId) : undefined;
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
                />);
            prevEventDay = currEventDay;
        }

        if (rows.length === 0) {
            rows.push(<div key="empty">There are no tracks in this program.</div>);
        }
    }

    return events && sessions ? <>{rows}</> : <LoadingSpinner />;
}
