import React, { useCallback, useMemo, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import useUserProfile from "../../../hooks/useUserProfile";
import { ProgramSession, ProgramSessionEvent, ProgramTrack, VideoRoom, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import "./WatchedItems.scss";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useConference from "../../../hooks/useConference";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { Link } from "react-router-dom";
import Column, { Item as ColumnItem } from "../../Columns/Column/Column";
import TrackMarker from "../Program/All/TrackMarker";
import SessionGroup from "../Program/All/SessionGroup";
import { SortedEventData, SortedSessionData } from "../Program/WholeProgramData";

function renderTrack(item: ColumnItem<ProgramTrack>): JSX.Element {
    return <>
        <TrackMarker track={item.renderData} small={true} />
        { item.link ? <Link to={item.link}>{item.text}</Link> : item.text}
    </>;
}

function renderSession(item: ColumnItem<SessionItemData>): JSX.Element {
    return <SessionGroup session={item.renderData.session} includeEvents={item.renderData.includeEvents} />;
}

interface SessionItemData {
    session: SortedSessionData;
    includeEvents: string[] | undefined;
}

export default function WatchedItemsPage() {
    const conference = useConference();
    const userProfile = useUserProfile();
    const [watchedItems, setWatchedItems] = useState<WatchedItems | null>(null);
    const [rooms, setRooms] = useState<Array<VideoRoom> | null>(null);

    useHeading("Followed Items");

    // Initial fetch of user's watched items
    useSafeAsync(async () => userProfile.watched, setWatchedItems, [userProfile.watchedId], "WatchedItems:setWatchedItems");

    // Subscribe to watched items updates
    const onWatchedItemsUpdated = useCallback(async function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        setWatchedItems(oldItems => {
            if (oldItems) {
                for (const object of update.objects) {
                    if (object.id === oldItems.id) {
                        return object as WatchedItems;
                    }
                }
            }
            return null;
        });
    }, []);
    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, !watchedItems, conference);

    // Fetch rooms
    useSafeAsync(async () => watchedItems?.watchedRoomObjects ?? null, setRooms, [watchedItems?.watchedRooms], "WatchedItems:setRooms");

    // Subscribe to watched rooms updates
    const onRoomUpdated = useCallback(async function _onRoomUpdated(update: DataUpdatedEventDetails<"VideoRoom">) {
        setRooms(oldRooms => oldRooms ? oldRooms.map(x => update.objects.find(y => x.id === y.id) as (VideoRoom | undefined) ?? x) : oldRooms);
    }, []);
    const onRoomDeleted = useCallback(async function _onRoomDeleted(update: DataDeletedEventDetails<"VideoRoom">) {
        setRooms(oldRooms => oldRooms?.filter(x => x.id !== update.objectId) ?? null);
    }, []);
    useDataSubscription("VideoRoom", onRoomUpdated, onRoomDeleted, !rooms, conference);

    // Fetch tracks
    const [programTracks, setProgramTracks] = useState<Array<ProgramTrack> | null>(null);
    useSafeAsync(async () => watchedItems?.watchedTrackObjects ?? null, setProgramTracks, [watchedItems], "WatchedItems:setProgramTracks");

    // Subscribe to watched track updates
    const onTrackUpdated = useCallback(async function _onTrackUpdated(ev: DataUpdatedEventDetails<"ProgramTrack">) {
        setProgramTracks(existing => existing ? existing.map(x => ev.objects.find(y => x.id === y.id) as (ProgramTrack | undefined) ?? x) : existing);
    }, []);

    const onTrackDeleted = useCallback(function _onTrackDeleted(ev: DataDeletedEventDetails<"ProgramTrack">) {
        setProgramTracks(oldRooms => oldRooms?.filter(x => x.id !== ev.objectId) ?? null);
    }, []);
    useDataSubscription("ProgramTrack", onTrackUpdated, onTrackDeleted, !programTracks, conference);

    const programTrackItems = useMemo<Array<ColumnItem<ProgramTrack>> | undefined>(() => {
        if (!programTracks) {
            return undefined;
        }

        return programTracks?.map(track => {
            return {
                text: track.name,
                link: `/track/${track.id}`,
                key: track.id,
                renderData: track,
            };
        });
    }, [programTracks]);

    // Fetch watched sessions
    const [programSessions, setProgramSessions] = useState<Array<ProgramSession> | null>(null);
    useSafeAsync(async () => watchedItems?.watchedSessionObjects ?? null, setProgramSessions, [watchedItems], "WatchedItems:setProgramSessions");

    // Subscribe to watched session updates
    const onProgramSessionUpdated = useCallback(async function _onProgramSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        setProgramSessions(existing => existing ? existing.map(x => ev.objects.find(y => x.id === y.id) as (ProgramSession | undefined) ?? x) : existing);
    }, []);

    const onProgramSessionDeleted = useCallback(function _onProgramSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        setProgramSessions(oldRooms => oldRooms?.filter(x => x.id !== ev.objectId) ?? null);
    }, []);
    useDataSubscription("ProgramSession", onProgramSessionUpdated, onProgramSessionDeleted, !programSessions, conference);

    // Fetch watched events
    const [programSessionEvents, setProgramSessionEvents] = useState<Array<ProgramSessionEvent> | null>(null);
    useSafeAsync(async () => watchedItems?.watchedEventObjects ?? null, setProgramSessionEvents, [watchedItems], "WatchedItems:setProgramSessionEvents");

    // Subscribe to watched event updates
    const onProgramSessionEventUpdated = useCallback(async function _onProgramSessionEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        setProgramSessionEvents(existing => existing ? existing.map(x => ev.objects.find(y => x.id === y.id) as (ProgramSessionEvent | undefined) ?? x) : existing);
    }, []);

    const onProgramSessionEventDeleted = useCallback(function _onProgramSessionEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
        setProgramSessionEvents(oldRooms => oldRooms?.filter(x => x.id !== ev.objectId) ?? null);
    }, []);
    useDataSubscription("ProgramSessionEvent", onProgramSessionEventUpdated, onProgramSessionEventDeleted, !programSessionEvents, conference);

    // Get pairs of session and event from individual watched events
    const [programPartialSessions, setProgramPartialSessions] = useState<{ session: ProgramSession, event: ProgramSessionEvent }[] | undefined>();
    useSafeAsync(async () => {
        if (!programSessionEvents) {
            return undefined;
        }
        const sessions = await Promise.all(programSessionEvents?.map(async event => ({ session: await event.session, event })));
        return sessions;
    }, setProgramPartialSessions, [programSessionEvents], "WatchedItems:setProgramPartialSessions");

    const watchedSessions = useMemo<Map<string, { session: ProgramSession, watchedEvents: string[] | undefined }> | undefined>(() => {
        if (!programSessions || !programPartialSessions) {
            return undefined;
        }

        const fullSessions: Map<string, { session: ProgramSession, watchedEvents: string[] | undefined }> = new Map(programSessions?.map(session => [session.id, { session, watchedEvents: undefined }]));

        for (const partialSession of programPartialSessions) {
            if (fullSessions.has(partialSession.session.id)) {
                const existingEvents = fullSessions.get(partialSession.session.id);
                if (existingEvents?.watchedEvents === undefined) {
                    // Full session already included
                    continue;
                } else {
                    // Partial session already included
                    existingEvents.watchedEvents?.push(partialSession.event.id);
                    fullSessions.set(partialSession.session.id, existingEvents);
                }
            } else {
                // Session not yet included
                fullSessions.set(partialSession.session.id, { session: partialSession.session, watchedEvents: [partialSession.event.id] });
            }
        }

        return fullSessions;
    }, [programPartialSessions, programSessions]);

    const [programSessionItems, setProgramSessionItems] = useState<Array<ColumnItem<SessionItemData>> | undefined>();

    useSafeAsync(async () => {
        if (!watchedSessions) {
            return undefined;
        }

        const items: Array<ColumnItem<SessionItemData>> = [];

        for (const [sessionId, { session, watchedEvents: events }] of watchedSessions) {
            const allEvents = (await session.events)
                .sort((x, y) =>
                    x.startTime < y.startTime ? -1
                        : x.startTime === y.startTime ? 0
                            : 1);
            const earliestStart = allEvents.reduce((r, e) => r.getTime() < e.startTime.getTime() ? r : e.startTime, new Date(32503680000000));
            const latestEnd = allEvents.reduce((r, e) => r.getTime() > e.endTime.getTime() ? r : e.endTime, new Date(0));
            const sessionCol: ColumnItem<SessionItemData> = {
                key: session.id,
                text: session.title,
                link: `/session/${sessionId}`,
                renderData: {
                    session: {
                        session,
                        earliestStart,
                        latestEnd,
                        eventsOfSession: await Promise.all(allEvents.map(async event => {
                            const item = await event.item;
                            const r: SortedEventData = {
                                event,
                                item: {
                                    authors: await item.authorPerons,
                                    item,
                                    eventsForItem: [event]
                                }
                            };
                            return r;
                        }))
                    },
                    includeEvents: events
                },
            };
            items.push(sessionCol);
        }

        return items;
    }, setProgramSessionItems, [watchedSessions], "WatchedItems:setProgramSessionItems");

    return <div className="watched-items">
        <p className="info">
            On this page you will find lists of the breakout rooms, tracks, sessions and events you are following.
        </p>
        <div className="columns whole-program">
            <div className="column rooms">
                <h2>Rooms</h2>
                {rooms
                    ? rooms.length > 0 ?
                        rooms.map(room =>
                            <div className="room-item" key={room.id}>
                                <span>{room.name}</span>
                                <span>({room.participants.length} members)</span>
                                <Link className="button" to={`/room/${room.id}`}>Go to room</Link>
                            </div>)
                        : <>You are not following any rooms.</>
                    : <LoadingSpinner message="Loading rooms" />}
            </div>
            <Column
                itemRenderer={{ render: renderTrack }}
                emptyMessage="You are not following any program tracks."
                loadingMessage="Loading program tracks"
                items={programTrackItems}
            >
                <h2>Tracks</h2>
            </Column>
            <Column
                itemRenderer={{ render: renderSession }}
                emptyMessage="You are not following any sessions or events."
                loadingMessage="Loading sessions and events"
                items={programSessionItems}
                sort={(a, b) => a.renderData.session.earliestStart.getTime() - b.renderData.session.latestEnd.getTime()}
            >
                <h2>Sessions and events</h2>
            </Column>
        </div>
    </div>;
}
