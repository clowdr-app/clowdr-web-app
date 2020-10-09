import React, { useCallback, useEffect, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import useUserProfile from "../../../hooks/useUserProfile";
import { WatchedItems } from "@clowdr-app/clowdr-db-schema";
import "./WatchedItems.scss";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useConference from "../../../hooks/useConference";
import useMaybeChat from "../../../hooks/useMaybeChat";
import { computeChatDisplayName, SidebarChatDescriptor, upgradeChatDescriptor } from "../../Sidebar/Groups/ChatsGroup";
import Message, { RenderedMessage, renderMessage } from "../../Chat/MessageList/Message";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { addError } from "../../../classes/Notifications/Notifications";

export default function WatchedItemsPage() {
    const conference = useConference();
    const userProfile = useUserProfile();
    const mChat = useMaybeChat();
    const [watchedItems, setWatchedItems] = useState<WatchedItems | null>(null);
    const [activeChats, setActiveChats] = useState<Array<SidebarChatDescriptor> | null>(null);
    const [messages, setMessages] = useState<Array<RenderedMessage> | null>(null);

    useHeading("Followed Stuff");

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
        return null;
    }, setActiveChats, [conference, conference.id, mChat, watchedItems?.watchedChats]);

    // Subscribe to watched items updates
    const onWatchedItemsUpdated = useCallback(async function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        if (update.object.id === userProfile.watchedId) {
            setWatchedItems(update.object as WatchedItems);
        }
    }, [userProfile.watchedId]);
    useDataSubscription("WatchedItems", onWatchedItemsUpdated, () => { }, !watchedItems, conference);

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

    useSafeAsync(async () => {
        if (mChat && activeChats) {
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
        return null;
    }, setMessages, [mChat, activeChats]);

    // WATCH_TODO: (repeated, non-sticky) Fetch watched rooms and participants
    // WATCH_TODO: Subscribe to changes in room names and participants

    // WATCH_TODO: (repeated, non-sticky) Fetch watched tracks, sessions and events
    // WATCH_TODO: Subscribe to changes in tracks, sessions and events

    // WATCH_TODO: Column of recent messages in followed chats, auto-updating
    // WATCH_TODO: Column of rooms being followed
    // WATCH_TODO: Column of tracks/sessions/events being followed

    return <div className="watched-stuff">
        <p className="info">
            On this page you will find recent messages from chats you are following (including all direct messages and announcements)
            as well as lists of the breakout rooms, tracks, sessions and events you are following.
        </p>
        <div className="columns">
            <div className="column messages">
                <div className="messages-inner">
                    {messages ? messages.map(x => <Message key={x.sid} msg={x} />) : <LoadingSpinner />}
                </div>
            </div>
            <div className="column">
                TODO: Followed rooms list
            </div>
            <div className="column">
                TODO: Followed tracks list
            </div>
            <div className="column">
                TODO: Followed sessions/events list
            </div>
        </div>
    </div>;
}
