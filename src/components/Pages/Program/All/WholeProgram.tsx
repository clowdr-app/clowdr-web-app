import React, { useCallback, useMemo, useState } from "react";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import "./WholeProgram.scss"
import useSafeAsync from "../../../../hooks/useSafeAsync";
import TrackColumn from "./TrackColumn";
import { ProgramItem, ProgramPerson, ProgramSession, ProgramSessionEvent, ProgramTrack } from "@clowdr-app/clowdr-db-schema";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import Toggle from "react-toggle";
import ScheduleView from "./ScheduleView";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { WholeProgramData } from "../WholeProgramData";

export default function WholeProgram() {
    const conference = useConference();

    const [scheduleView, setScheduleView] = useState(true);
    const [data, setData] = useState<WholeProgramData | null>(null);

    useHeading("Whole program");

    // Fetch data
    useSafeAsync(
        async () => {
            const [tracks, sessions, events, authors, items]
                = await Promise.all<
                    Array<ProgramTrack>,
                    Array<ProgramSession>,
                    Array<ProgramSessionEvent>,
                    Array<ProgramPerson>,
                    Array<ProgramItem>
                >([
                    ProgramTrack.getAll(conference.id),
                    ProgramSession.getAll(conference.id),
                    ProgramSessionEvent.getAll(conference.id),
                    ProgramPerson.getAll(conference.id),
                    ProgramItem.getAll(conference.id)
                ]);
            return { tracks, sessions, events, authors, items };
        },
        setData,
        [conference.id]);

    // Subscribe to changes
    const onTrackUpdated = useCallback(function _onTrackUpdated(ev: DataUpdatedEventDetails<"ProgramTrack">) {
        setData(oldData => {
            if (oldData) {
                const oldTracks = oldData.tracks;
                const newTracks = Array.from(oldTracks);
                const idx = newTracks?.findIndex(x => x.id === ev.object.id);
                if (idx === -1) {
                    newTracks.push(ev.object as ProgramTrack);
                }
                else {
                    newTracks.splice(idx, 1, ev.object as ProgramTrack);
                }
                return { ...oldData, tracks: newTracks };
            }
            return null;
        });
    }, []);
    const onTrackDeleted = useCallback(function _onTrackDeleted(ev: DataDeletedEventDetails<"ProgramTrack">) {
        setData(oldData => oldData ? { ...oldData, tracks: oldData.tracks.filter(x => x.id !== ev.objectId) } : null);
    }, []);
    useDataSubscription("ProgramTrack", onTrackUpdated, onTrackDeleted, !data, conference);

    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        setData(oldData => {
            if (oldData) {
                const oldSessions = oldData.sessions;
                const newSessions = Array.from(oldSessions);
                const idx = newSessions?.findIndex(x => x.id === ev.object.id);
                if (idx === -1) {
                    newSessions.push(ev.object as ProgramSession);
                }
                else {
                    newSessions.splice(idx, 1, ev.object as ProgramSession);
                }
                return { ...oldData, sessions: newSessions };
            }
            return null;
        });
    }, []);
    const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        setData(oldData => oldData ? { ...oldData, sessions: oldData.sessions.filter(x => x.id !== ev.objectId) } : null);
    }, []);
    useDataSubscription("ProgramSession", onSessionUpdated, onSessionDeleted, !data, conference);

    const onSessionEventUpdated = useCallback(function _onSessionEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        setData(oldData => {
            if (oldData) {
                const oldSessionEvents = oldData.events;
                const newSessionEvents = Array.from(oldSessionEvents);
                const idx = newSessionEvents?.findIndex(x => x.id === ev.object.id);
                if (idx === -1) {
                    newSessionEvents.push(ev.object as ProgramSessionEvent);
                }
                else {
                    newSessionEvents.splice(idx, 1, ev.object as ProgramSessionEvent);
                }
                return { ...oldData, sessionevents: newSessionEvents };
            }
            return null;
        });
    }, []);
    const onSessionEventDeleted = useCallback(function _onSessionEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
        setData(oldData => oldData ? { ...oldData, sessionevents: oldData.events.filter(x => x.id !== ev.objectId) } : null);
    }, []);
    useDataSubscription("ProgramSessionEvent", onSessionEventUpdated, onSessionEventDeleted, !data, conference);

    const onPersonUpdated = useCallback(function _onPersonUpdated(ev: DataUpdatedEventDetails<"ProgramPerson">) {
        setData(oldData => {
            if (oldData) {
                const oldPersons = oldData.authors;
                const newPersons = Array.from(oldPersons);
                const idx = newPersons?.findIndex(x => x.id === ev.object.id);
                if (idx === -1) {
                    newPersons.push(ev.object as ProgramPerson);
                }
                else {
                    newPersons.splice(idx, 1, ev.object as ProgramPerson);
                }
                return { ...oldData, persons: newPersons };
            }
            return null;
        });
    }, []);
    const onPersonDeleted = useCallback(function _onPersonDeleted(ev: DataDeletedEventDetails<"ProgramPerson">) {
        setData(oldData => oldData ? { ...oldData, persons: oldData.authors.filter(x => x.id !== ev.objectId) } : null);
    }, []);
    useDataSubscription("ProgramPerson", onPersonUpdated, onPersonDeleted, !data, conference);

    const onItemUpdated = useCallback(function _onItemUpdated(ev: DataUpdatedEventDetails<"ProgramItem">) {
        setData(oldData => {
            if (oldData) {
                const oldItems = oldData.items;
                const newItems = Array.from(oldItems);
                const idx = newItems?.findIndex(x => x.id === ev.object.id);
                if (idx === -1) {
                    newItems.push(ev.object as ProgramItem);
                }
                else {
                    newItems.splice(idx, 1, ev.object as ProgramItem);
                }
                return { ...oldData, items: newItems };
            }
            return null;
        });
    }, []);
    const onItemDeleted = useCallback(function _onItemDeleted(ev: DataDeletedEventDetails<"ProgramItem">) {
        setData(oldData => oldData ? { ...oldData, items: oldData.items.filter(x => x.id !== ev.objectId) } : null);
    }, []);
    useDataSubscription("ProgramItem", onItemUpdated, onItemDeleted, !data, conference);

    const columns: Array<JSX.Element> = useMemo(() => {
        let _columns: Array<JSX.Element> = [];
        if (data) {
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
                    .map(track => <TrackColumn key={track.id} track={track} data={data} />);

            if (_columns.length === 0) {
                _columns.push(<div key="empty">There are no tracks in this program.</div>);
            }
        }
        return _columns;
    }, [data]);

    const schedule = useMemo(() => {
        return data ? <ScheduleView data={data} /> : <LoadingSpinner />
    }, [data]);

    return <div className="whole-program-page">
        <div className="switcher">
            <label>
                <span>Schedule</span>
                <Toggle
                    icons={false}
                    defaultChecked={!scheduleView}
                    onChange={(ev) => setScheduleView(!ev.target.checked)}
                />
                <span>Tracks</span>
            </label>
        </div>
        <div className={`whole-program${scheduleView ? " schedule" : " tracks"}`}>
            <div className="schedule">
                {schedule}
            </div>
            <div className="tracks">
                {columns}
            </div>
        </div>
    </div>;
}
