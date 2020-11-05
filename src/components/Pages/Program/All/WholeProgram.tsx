import React, { useCallback, useState } from "react";
import useConference from "../../../../hooks/useConference";
import useHeading from "../../../../hooks/useHeading";
import "./WholeProgram.scss"
import useSafeAsync from "../../../../hooks/useSafeAsync";
import { ConferenceConfiguration, ContentFeed, ProgramItem, ProgramPerson, ProgramSession, ProgramSessionEvent, ProgramTrack } from "@clowdr-app/clowdr-db-schema";
import useDataSubscription from "../../../../hooks/useDataSubscription";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import Toggle from "react-toggle";
import ScheduleView from "./ScheduleView";
import { LoadingSpinner } from "../../../LoadingSpinner/LoadingSpinner";
import { WholeProgramData } from "../WholeProgramData";
import TracksView from "./TracksView";
import StreamsView from "./StreamsView";

type ViewOptions = "schedule" | "tracks" | "streams";

export default function WholeProgram() {
    const conference = useConference();

    const [view, setView] = useState<ViewOptions>("streams");
    const [data, setData] = useState<WholeProgramData | null>(null);
    const [programViews, setProgramViews] = useState<Array<ViewOptions> | null>(null);

    useHeading("Whole program");

    // Fetch data
    useSafeAsync(async () => {
        const configs = await ConferenceConfiguration.getByKey("WHOLE_PROGRAM_VIEWS", conference.id);
        if (configs.length > 0) {
            return JSON.parse(configs[0].value);
        }
        return ["schedule", "tracks"];
    }, (views: Array<ViewOptions>) => {
        setProgramViews(views);
        if (!views.includes(view)) {
            setView(views[0]);
        }
    }, [conference.id], "WholeProgram:setProgramViews");

    useSafeAsync(
        async () => {
            const [tracks, sessions, events, authors, items, feeds]
                = await Promise.all<
                    Array<ProgramTrack>,
                    Array<ProgramSession>,
                    Array<ProgramSessionEvent>,
                    Array<ProgramPerson>,
                    Array<ProgramItem>,
                    Array<ContentFeed>
                >([
                    ProgramTrack.getAll(conference.id),
                    ProgramSession.getAll(conference.id),
                    ProgramSessionEvent.getAll(conference.id),
                    ProgramPerson.getAll(conference.id),
                    ProgramItem.getAll(conference.id),
                    ContentFeed.getAll(conference.id)
                ]);
            return { tracks, sessions, events, authors, items, feeds };
        },
        setData,
        [conference.id], "WholeProgram:setData");

    // Subscribe to changes
    const onTrackUpdated = useCallback(function _onTrackUpdated(ev: DataUpdatedEventDetails<"ProgramTrack">) {
        setData(oldData => {
            if (oldData) {
                const oldTracks = oldData.tracks;
                const newTracks = Array.from(oldTracks);
                for (const object of ev.objects) {
                    const idx = newTracks?.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        newTracks.push(object as ProgramTrack);
                    }
                    else {
                        newTracks.splice(idx, 1, object as ProgramTrack);
                    }
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
                for (const object of ev.objects) {
                    const idx = newSessions?.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        newSessions.push(object as ProgramSession);
                    }
                    else {
                        newSessions.splice(idx, 1, object as ProgramSession);
                    }
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
                for (const object of ev.objects) {
                    const idx = newSessionEvents?.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        newSessionEvents.push(object as ProgramSessionEvent);
                    }
                    else {
                        newSessionEvents.splice(idx, 1, object as ProgramSessionEvent);
                    }
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
                for (const object of ev.objects) {
                    const idx = newPersons?.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        newPersons.push(object as ProgramPerson);
                    }
                    else {
                        newPersons.splice(idx, 1, object as ProgramPerson);
                    }
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
                for (const object of ev.objects) {
                    const idx = newItems?.findIndex(x => x.id === object.id);
                    if (idx === -1) {
                        newItems.push(object as ProgramItem);
                    }
                    else {
                        newItems.splice(idx, 1, object as ProgramItem);
                    }
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

    const [scheduleComponent, setScheduleComponent] = useState<JSX.Element | null>();
    useSafeAsync(async () => {
        let _scheduleComponent = scheduleComponent ? scheduleComponent : undefined;
        if (view === "schedule" && !_scheduleComponent && data) {
            _scheduleComponent = <ScheduleView data={data} />;
        }
        return _scheduleComponent;
    }, setScheduleComponent, [data, view, scheduleComponent], "WholeProgram:setScheduleComponent");

    const [tracksComponent, setTracksComponent] = useState<JSX.Element | null>();
    useSafeAsync(async () => {
        let _tracksComponent = tracksComponent ? tracksComponent : undefined;
        if (view === "tracks" && !_tracksComponent && data) {
            _tracksComponent = <TracksView data={data} />;
        }
        return _tracksComponent;
    }, setTracksComponent, [data, view, tracksComponent], "WholeProgram:setTracksComponent");

    const [streamsComponent, setStreamsComponent] = useState<JSX.Element | null>();
    useSafeAsync(async () => {
        let _streamsComponent = streamsComponent ? streamsComponent : undefined;
        if (view === "streams" && !_streamsComponent && data) {
            _streamsComponent = <StreamsView data={data} />;
        }
        return _streamsComponent;
    }, setStreamsComponent, [data, view, streamsComponent], "WholeProgram:setStreamsComponent");

    let contentComponent;
    if (programViews && view) {
        if (view === "streams") {
            contentComponent = !data
                ? <LoadingSpinner />
                : <div className={`whole-program tracks`}>
                    {streamsComponent ?? <LoadingSpinner message="Loading streams view" />}
                </div>;
        }
        else {
            contentComponent = <>
                {programViews.length > 0
                    ? <div className="switcher">
                        <label>
                            <span>Schedule</span>
                            <Toggle
                                icons={false}
                                defaultChecked={!view}
                                onChange={(ev) => setView(ev.target.checked ? "tracks" : "schedule")}
                            />
                            <span>Tracks</span>
                        </label>
                    </div>
                    : <></>}
                <div className={`whole-program ${view}`}>
                    {!data ? <LoadingSpinner />
                        : view === "schedule"
                            ? scheduleComponent ?? <LoadingSpinner message="Loading schedule view" />
                            : tracksComponent ?? <LoadingSpinner message="Loading tracks view" />
                    }
                </div>
            </>;
        }
    }
    else {
        contentComponent = <LoadingSpinner />;
    }

    return <div className="whole-program-page">
        {contentComponent}
    </div>;
}
