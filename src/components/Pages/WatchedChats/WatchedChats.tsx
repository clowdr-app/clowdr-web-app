import React, { useCallback, useEffect, useState } from "react";
import useHeading from "../../../hooks/useHeading";
import useUserProfile from "../../../hooks/useUserProfile";
import { WatchedItems } from "@clowdr-app/clowdr-db-schema";
import "./WatchedChats.scss";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useConference from "../../../hooks/useConference";
import useMaybeChat from "../../../hooks/useMaybeChat";
import { computeChatDisplayName, SidebarChatDescriptor, upgradeChatDescriptor } from "../../Sidebar/Groups/ChatsGroup";
import Message, { RenderedMessage, renderMessage } from "../../Chat/MessageList/Message";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import { addError } from "../../../classes/Notifications/Notifications";
import { removeNull } from "@clowdr-app/clowdr-db-schema/build/Util";

export default function WatchedChatsPage() {
    const conference = useConference();
    const userProfile = useUserProfile();
    const mChat = useMaybeChat();
    const [watchedItems, setWatchedItems] = useState<WatchedItems | null>(null);
    const [activeChats, setActiveChats] = useState<Array<SidebarChatDescriptor> | null>(null);
    const [messages, setMessages] = useState<Array<RenderedMessage> | null>(null);

    useHeading("Followed Chats");

    // Initial fetch of user's watched items
    useSafeAsync(async () => userProfile.watched, setWatchedItems, [userProfile.watchedId], "WatchedChats:setWatchedItems");

    useSafeAsync(async () => {
        if (mChat && watchedItems?.watchedChats) {
            const watchedChatIds = watchedItems?.watchedChats;
            const chats = removeNull(await Promise.all(watchedChatIds.map(id => mChat.getChat(id))));
            const chatsWithName: Array<SidebarChatDescriptor>
                = await Promise.all(chats.map(x => upgradeChatDescriptor(conference, x)));
            return chatsWithName;
        }
        return undefined;
    }, setActiveChats, [conference, conference.id, mChat, watchedItems?.watchedChats], "WatchedChats:setActiveChats");

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
        const addFunctionsToOff = activeChats ? Promise.all(activeChats.map(async c => {
            const chatName = computeChatDisplayName(c, userProfile).friendlyName;
            return {
                id: c.id,
                f: await mChat?.channelEventOn(c.id, "messageAdded", {
                    componentName: "WatchedItems",
                    caller: "setMessages",
                    function: async (msg) => {
                        if (msg.author !== userProfile.id) {
                            const renderedMsg = await renderMessage(conference, userProfile, c.id, msg, c.isDM, chatName);
                            // We only ever add to the list
                            setMessages(oldMessages => oldMessages ? [...oldMessages, renderedMsg] : [renderedMsg]);
                        }
                    }
                })
            };
        })) : Promise.resolve([]);

        const updateFunctionsToOff = activeChats ? Promise.all(activeChats.map(async c => {
            const chatName = computeChatDisplayName(c, userProfile).friendlyName;
            return {
                id: c.id,
                f: await mChat?.channelEventOn(c.id, "messageUpdated", {
                    componentName: "WatchedItems",
                    caller: "setMessages",
                    function: async (msg) => {
                        if (msg.updateReasons.includes("body") ||
                            msg.updateReasons.includes("author") ||
                            msg.updateReasons.includes("attributes")) {
                            const renderedMsg = await renderMessage(conference, userProfile, c.id, msg.message, c.isDM, chatName);
                            setMessages(oldMessages => oldMessages
                                ? oldMessages.map(x => x.sid === msg.message.sid ? renderedMsg : x)
                                : oldMessages
                            );
                        }
                    }
                })
            };
        })) : Promise.resolve([]);

        const removeFunctionsToOff = activeChats ? Promise.all(activeChats.map(async c => {
            return {
                id: c.id,
                f: await mChat?.channelEventOn(c.id, "messageRemoved", {
                    componentName: "WatchedItems",
                    caller: "setMessages",
                    function: async (msg) => {
                        setMessages(oldMessages => oldMessages
                            ? oldMessages.filter(x => x.sid !== msg.sid)
                            : oldMessages
                        );
                    }
                })
            };
        })) : Promise.resolve([]);

        return () => {
            addFunctionsToOff.then(fs => {
                fs.forEach(f => {
                    if (f.f) {
                        mChat?.channelEventOff(f.id, "messageAdded", f.f);
                    }
                });
            });

            updateFunctionsToOff.then(fs => {
                fs.forEach(f => {
                    if (f.f) {
                        mChat?.channelEventOff(f.id, "messageUpdated", f.f);
                    }
                });
            });

            removeFunctionsToOff.then(fs => {
                fs.forEach(f => {
                    if (f.f) {
                        mChat?.channelEventOff(f.id, "messageRemoved", f.f);
                    }
                });
            });
        };
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
    }, setMessages, [mChat, activeChats, messages], "WatchedChats:setMessages");

    return <div className="watched-chats">
        <p className="info">
            On this page you will find recent messages from chats you are following (including all direct messages and announcements).
        </p>
        <div className="messages">
            <div className="messages-inner">
                {messages
                    ? messages.length === 0
                        ? <>No recent chat messages from followed chats.</>
                        : messages
                            .sort((x, y) => x.time > y.time ? -1 : x.time === y.time ? 0 : 1)
                            .map(x => <Message key={x.sid} msg={x} />)
                    : <LoadingSpinner message="Loading chats" />}
            </div>
        </div>
    </div>;
}
