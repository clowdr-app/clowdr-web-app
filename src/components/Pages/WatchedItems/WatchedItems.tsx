import React, { useCallback, useEffect, useMemo, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import useUserProfile from "../../../hooks/useUserProfile";
import { ProgramSession, ProgramSessionEvent, ProgramTrack, VideoRoom, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import "./WatchedItems.scss";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { DataDeletedEventDetails, DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useConference from "../../../hooks/useConference";
import useMaybeChat from "../../../hooks/useMaybeChat";
import { computeChatDisplayName, SidebarChatDescriptor, upgradeChatDescriptor } from "../../Sidebar/Groups/ChatsGroup";
import Message, { RenderedMessage, renderMessage } from "../../Chat/MessageList/Message";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { addError } from "../../../classes/Notifications/Notifications";
import { Link } from "react-router-dom";
import Column, { Item as ColumnItem } from "../../Columns/Column/Column";
import TrackMarker from "../Program/All/TrackMarker";
import SessionGroup from "../Program/All/SessionGroup";
import { removeNull } from "@clowdr-app/clowdr-db-schema/build/Util";

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
    session: ProgramSession;
    includeEvents: string[] | undefined;
}

export default function WatchedItemsPage() {
    const conference = useConference();
    const userProfile = useUserProfile();
    const mChat = useMaybeChat();
    const [watchedItems, setWatchedItems] = useState<WatchedItems | null>(null);
    const [activeChats, setActiveChats] = useState<Array<SidebarChatDescriptor> | null>(null);
    const [rooms, setRooms] = useState<Array<VideoRoom> | null>(null);
    const [messages, setMessages] = useState<Array<RenderedMessage> | null>(null);

    useHeading("Followed Items");

    // Initial fetch of user's watched items
    useSafeAsync(async () => userProfile.watched, setWatchedItems, [userProfile.watchedId]);

    useSafeAsync(async () => {
        if (mChat && watchedItems?.watchedChats) {
            const watchedChatIds = watchedItems?.watchedChats;
            const chats = removeNull(await Promise.all(watchedChatIds.map(id => mChat.getChat(id))));
            const chatsWithName: Array<SidebarChatDescriptor>
                = await Promise.all(chats.map(x => upgradeChatDescriptor(conference, x)));
            return chatsWithName;
        }
        return undefined;
    }, setActiveChats, [conference, conference.id, mChat, watchedItems?.watchedChats]);

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

    // Subscribe to chat messages
    useEffect(() => {
        if (mChat && activeChats) {
            const addFunctionsToOff = Promise.all(activeChats.map(async c => {
                const chatName = computeChatDisplayName(c, userProfile).friendlyName;
                return {
                    id: c.id,
                    f: await mChat.channelEventOn(c.id, "messageAdded", async (msg) => {
                        if (msg.author !== userProfile.id) {
                            const renderedMsg = await renderMessage(conference, userProfile, c.id, msg, c.isDM, chatName);
                            // We only ever add to the list
                            setMessages(oldMessages => oldMessages ? [...oldMessages, renderedMsg] : [renderedMsg]);
                        }
                    })
                };
            }));

            const updateFunctionsToOff = Promise.all(activeChats.map(async c => {
                const chatName = computeChatDisplayName(c, userProfile).friendlyName;
                return {
                    id: c.id,
                    f: await mChat.channelEventOn(c.id, "messageUpdated", async (msg) => {
                        if (msg.updateReasons.includes("body") ||
                            msg.updateReasons.includes("author") ||
                            msg.updateReasons.includes("attributes")) {
                            const renderedMsg = await renderMessage(conference, userProfile, c.id, msg.message, c.isDM, chatName);
                            setMessages(oldMessages => oldMessages
                                ? oldMessages.map(x => x.sid === msg.message.sid ? renderedMsg : x)
                                : oldMessages
                            );
                        }
                    })
                };
            }));

            const removeFunctionsToOff = Promise.all(activeChats.map(async c => {
                return {
                    id: c.id,
                    f: await mChat.channelEventOn(c.id, "messageRemoved", async (msg) => {
                        setMessages(oldMessages => oldMessages
                            ? oldMessages.filter(x => x.sid !== msg.sid)
                            : oldMessages
                        );
                    })
                };
            }));

            return () => {
                addFunctionsToOff.then(fs => {
                    fs.forEach(f => mChat.channelEventOff(f.id, "messageAdded", f.f));
                });

                updateFunctionsToOff.then(fs => {
                    fs.forEach(f => mChat.channelEventOff(f.id, "messageUpdated", f.f));
                });

                removeFunctionsToOff.then(fs => {
                    fs.forEach(f => mChat.channelEventOff(f.id, "messageRemoved", f.f));
                });
            };
        }
        return () => { };
    }, [mChat, userProfile, activeChats, conference]);

    // Fetch chat messages
    useSafeAsync(async () => {
        if (mChat && activeChats && !messages) {
            try {
                return (await Promise.all(activeChats.map(async c => {
                    const chatName = computeChatDisplayName(c, userProfile).friendlyName;
                    const msgs = (await mChat.getMessages(c.id, 5))?.items;
                    if (msgs) {
                        return Promise.all(msgs
                            .filter(x => x.author !== userProfile.id)
                            .map(x => renderMessage(conference, userProfile, c.id, x, c.isDM, chatName))
                        );
                    }
                    return null;
                }))).reduce<RenderedMessage[]>((acc, xs) => xs ? acc.concat(xs) : [], []);
            }
            catch (e) {
                console.error("Failed to fetch chat messages.", e);
                addError("Failed to fetch chat messages.");
            }
        }
        return undefined;
    }, setMessages, [mChat, activeChats, messages]);

    // Fetch rooms
    useSafeAsync(async () => watchedItems?.watchedRoomObjects ?? null, setRooms, [watchedItems?.watchedRooms]);

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
    useSafeAsync(async () => watchedItems?.watchedTrackObjects ?? null, setProgramTracks, [watchedItems]);

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
    useSafeAsync(async () => watchedItems?.watchedSessionObjects ?? null, setProgramSessions, [watchedItems]);

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
    useSafeAsync(async () => watchedItems?.watchedEventObjects ?? null, setProgramSessionEvents, [watchedItems]);

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
    }, setProgramPartialSessions, [programSessionEvents]);

    const watchedSessions = useMemo<Map<string, { session: ProgramSession, events: string[] | undefined }> | undefined>(() => {
        if (!programSessions || !programPartialSessions) {
            return undefined;
        }

        const fullSessions: Map<string, { session: ProgramSession, events: string[] | undefined }> = new Map(programSessions?.map(session => [session.id, { session, events: undefined }]));

        for (const partialSession of programPartialSessions) {
            if (fullSessions.has(partialSession.session.id)) {
                const existingEvents = fullSessions.get(partialSession.session.id);
                if (existingEvents?.events === undefined) {
                    // Full session already included
                    continue;
                } else {
                    // Partial session already included
                    existingEvents.events?.push(partialSession.event.id);
                    fullSessions.set(partialSession.session.id, existingEvents);
                }
            } else {
                // Session not yet included
                fullSessions.set(partialSession.session.id, { session: partialSession.session, events: [partialSession.event.id] });
            }
        }

        return fullSessions;
    }, [programPartialSessions, programSessions]);

    const programSessionItems = useMemo<Array<ColumnItem<SessionItemData>> | undefined>(() => {
        if (!watchedSessions) {
            return undefined;
        }

        const items = [];

        for (const [sessionId, { session, events }] of watchedSessions) {
            items.push({
                key: sessionId,
                text: session.title,
                link: `/session/${sessionId}`,
                renderData: { session, includeEvents: events },
            });
        }

        return items;
    }, [watchedSessions]);

    return <div className="watched-items">
        <p className="info">
            On this page you will find recent messages from chats you are following (including all direct messages and announcements)
            as well as lists of the breakout rooms, tracks, sessions and events you are following.
        </p>
        <div className="columns">
            <div className="column messages">
                <div className="messages-inner">
                    {messages
                        ? messages.length === 0
                            ? <>No recent chat messages from followed chats.</>
                            : messages
                                .sort((x, y) => x.time < y.time ? -1 : x.time === y.time ? 0 : 1)
                                .map(x => <Message key={x.sid} msg={x} />)
                        : <LoadingSpinner message="Loading chats" />}
                </div>
            </div>
            <div className="column rooms">
                {rooms
                    ? rooms.map(room =>
                        <div className="room-item" key={room.id}>
                            <span>{room.name}</span>
                            <span>({room.participants.length} members)</span>
                            <Link className="button" to={`/room/${room.id}`}>Go to room</Link>
                        </div>)
                    : <LoadingSpinner message="Loading rooms" />}
            </div>
            <Column
                className="column tracks"
                itemRenderer={{ render: renderTrack }}
                emptyMessage="You are not following any program tracks."
                loadingMessage="Loading program tracks"
                items={programTrackItems}
            >
                <h2>Tracks</h2>
            </Column>
            <Column
                className="column sessions"
                itemRenderer={{ render: renderSession }}
                emptyMessage="You are not following any sessions or events."
                loadingMessage="Loading sessions and events"
                items={programSessionItems}
                sort={(a, b) => a.renderData.session.startTime.getTime() - b.renderData.session.endTime.getTime()}>
                <h2>Sessions and events</h2>
            </Column>
        </div>
    </div>;
}
