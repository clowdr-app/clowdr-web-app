import React, { useCallback, useEffect, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import useUserProfile from "../../../hooks/useUserProfile";
import { VideoRoom, WatchedItems } from "@clowdr-app/clowdr-db-schema";
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
            const chats = await Promise.all(watchedChatIds.map(id => mChat.getChat(id)));
            const chatsWithName: Array<SidebarChatDescriptor>
                = await Promise.all(chats.map(x => upgradeChatDescriptor(conference, x)));
            return chatsWithName;
        }
        return undefined;
    }, setActiveChats, [conference, conference.id, mChat, watchedItems?.watchedChats]);

    // Subscribe to watched items updates
    const onWatchedItemsUpdated = useCallback(async function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        setWatchedItems(oldItems => oldItems?.id === update.object.id ? update.object as WatchedItems : oldItems);
    }, []);
    useDataSubscription("WatchedItems", onWatchedItemsUpdated, () => { }, !watchedItems, conference);

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
                    const msgs = (await mChat.getMessages(c.id, 5)).items;
                    return Promise.all(msgs
                        .filter(x => x.author !== userProfile.id)
                        .map(x => renderMessage(conference, userProfile, c.id, x, c.isDM, chatName))
                    );
                }))).reduce<RenderedMessage[]>((acc, xs) => acc.concat(xs), []);
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
        setRooms(oldRooms => oldRooms ? oldRooms.map(x => x.id === update.object.id ? update.object as VideoRoom : x) : oldRooms);
    }, []);
    const onRoomDeleted = useCallback(async function _onRoomDeleted(update: DataDeletedEventDetails<"VideoRoom">) {
        setRooms(oldRooms => oldRooms?.filter(x => x.id !== update.objectId) ?? null);
    }, []);
    useDataSubscription("VideoRoom", onRoomUpdated, onRoomDeleted, !rooms, conference);

    // WATCH_TODO: (repeated, non-sticky) Fetch watched tracks, sessions and events
    // WATCH_TODO: Subscribe to changes in tracks, sessions and events

    // WATCH_TODO: Column of recent messages in followed chats, auto-updating
    // WATCH_TODO: Column of rooms being followed
    // WATCH_TODO: Column of tracks/sessions/events being followed

    return <div className="watched-Items">
        <p className="info">
            On this page you will find recent messages from chats you are following (including all direct messages and announcements)
            as well as lists of the breakout rooms, tracks, sessions and events you are following.
        </p>
        <div className="columns">
            <div className="column messages">
                <div className="messages-inner">
                    {messages ? messages.map(x => <Message key={x.sid} msg={x} />) : <LoadingSpinner message="Loading chats" />}
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
            <div className="column tracks">
                TODO: Followed tracks list
            </div>
            <div className="column sessions">
                TODO: Followed sessions/events list
            </div>
        </div>
    </div>;
}
