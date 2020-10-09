import React, { useEffect, useReducer } from 'react';
import useConference from '../../../hooks/useConference';
import useMaybeUserProfile from '../../../hooks/useMaybeUserProfile';
import MenuExpander, { ButtonSpec } from "../Menu/MenuExpander";
import MenuGroup, { MenuGroupItems } from '../Menu/MenuGroup';
import MenuItem from '../Menu/MenuItem';
import { Conference, UserProfile } from '@clowdr-app/clowdr-db-schema';
import { makeCancelable } from '@clowdr-app/clowdr-db-schema/build/Util';
import useMaybeChat from '../../../hooks/useMaybeChat';
import { ChatDescriptor, MemberDescriptor } from '../../../classes/Chat';
import assert from 'assert';
import { ServiceEventNames } from '../../../classes/Chat/Services/Twilio/ChatService';
import Chat from '../../../classes/Chat/Chat';
import { LoadingSpinner } from '../../LoadingSpinner/LoadingSpinner';
import useLogger from '../../../hooks/useLogger';

type ChatGroupTasks
    = "loadingActiveChats"
    | "loadingAllChats";

type SidebarChatDescriptor = {
    id: string;
    friendlyName: string;
    status: 'joined' | undefined;
} & ({
    isDM: false;
} | {
    isDM: true;
    member1: MemberDescriptor & { displayName: string };
    member2: MemberDescriptor & { displayName: string };
});

interface ChatsGroupState {
    tasks: Set<ChatGroupTasks>;
    isOpen: boolean;
    chatSearch: string | null;
    activeChats: Array<SidebarChatDescriptor> | null;
    allChats: Array<ChatDescriptor> | null;
    filteredChats: Array<SidebarChatDescriptor>;
}

type ChatsGroupUpdate
    = { action: "updateAllChats"; chats: Array<ChatDescriptor> }
    | { action: "updateActiveChats"; chats: Array<SidebarChatDescriptor> }
    | { action: "updateFilteredChats"; chats: Array<SidebarChatDescriptor> }
    | { action: "deleteFromActiveChats"; chats: Array<string> }
    | { action: "deleteFromAllChats"; chats: Array<string> }
    | { action: "searchChats"; search: string | null }
    | { action: "setIsOpen"; isOpen: boolean }
    | { action: "updateChatDescriptors"; f: (x: SidebarChatDescriptor) => SidebarChatDescriptor }
    ;

async function filterChats(
    allChats: Array<ChatDescriptor>,
    _search: string | null,
    minSearchLength: number): Promise<Array<ChatDescriptor>> {
    if (_search && _search.length >= minSearchLength) {
        const search = _search.toLowerCase();
        return allChats.filter(x => x.friendlyName.toLowerCase().includes(search));
    }
    else {
        return allChats;
    }
}

function nextSidebarState(currentState: ChatsGroupState, updates: ChatsGroupUpdate | Array<ChatsGroupUpdate>): ChatsGroupState {
    const nextState: ChatsGroupState = {
        tasks: new Set(currentState.tasks),
        isOpen: currentState.isOpen,
        chatSearch: currentState.chatSearch,
        allChats: currentState.allChats,
        activeChats: currentState.activeChats,
        filteredChats: currentState.filteredChats,
    };

    let allChatsUpdated = false;
    let activeChatsUpdated = false;

    function doUpdate(update: ChatsGroupUpdate) {
        switch (update.action) {
            case "searchChats":
                nextState.chatSearch = update.search?.length ? update.search : null;
                break;
            case "setIsOpen":
                nextState.isOpen = update.isOpen;
                break;
            case "updateAllChats":
                {
                    const changes = [...update.chats];
                    const updatedIds = changes.map(x => x.id);
                    nextState.allChats = nextState.allChats?.map(x => {
                        const idx = updatedIds.indexOf(x.id);
                        if (idx > -1) {
                            const y = changes[idx];
                            updatedIds.splice(idx, 1);
                            changes.splice(idx, 1);
                            return y;
                        }
                        else {
                            return x;
                        }
                    }) ?? null;
                    nextState.allChats = nextState.allChats?.concat(changes) ?? changes;
                    allChatsUpdated = true;
                }
                break;
            case "updateActiveChats":
                {
                    const changes = [...update.chats];
                    const updatedIds = changes.map(x => x.id);
                    nextState.activeChats = nextState.activeChats?.map(x => {
                        const idx = updatedIds.indexOf(x.id);
                        if (idx > -1) {
                            const y = changes[idx];
                            updatedIds.splice(idx, 1);
                            changes.splice(idx, 1);
                            return y;
                        }
                        else {
                            return x;
                        }
                    }) ?? null;
                    nextState.activeChats = nextState.activeChats?.concat(changes) ?? changes;
                    activeChatsUpdated = true;
                }
                break;
            case "deleteFromActiveChats":
                nextState.activeChats = nextState.activeChats?.filter(x => !update.chats.includes(x.id)) ?? null;
                activeChatsUpdated = true;
                break;
            case "deleteFromAllChats":
                nextState.allChats = nextState.allChats?.filter(x => !update.chats.includes(x.id)) ?? null;
                allChatsUpdated = true;
                break;

            case "updateFilteredChats":
                nextState.filteredChats = update.chats;
                break;
            case "updateChatDescriptors":
                if (nextState.activeChats) {
                    nextState.activeChats = nextState.activeChats.map(update.f);
                }

                if (nextState.allChats) {
                    nextState.filteredChats = nextState.filteredChats.map(update.f);
                }
                break;
        }
    }

    if (updates instanceof Array) {
        updates.forEach(doUpdate);
    }
    else {
        doUpdate(updates);
    }

    if (allChatsUpdated) {
        if (nextState.allChats) {
            nextState.tasks.delete("loadingAllChats");
        }
        else {
            nextState.filteredChats = [];
        }
    }

    if (activeChatsUpdated) {
        nextState.tasks.delete("loadingActiveChats");
    }

    return nextState;
}

export async function upgradeChatDescriptor(conf: Conference, x: ChatDescriptor): Promise<SidebarChatDescriptor> {
    if (x.isDM) {
        const [p1, p2] = await Promise.all([
            UserProfile.get(x.member1.profileId, conf.id),
            UserProfile.get(x.member2.profileId, conf.id)
        ]);
        assert(p1);
        assert(p2);
        return {
            ...x,
            member1: {
                ...x.member1,
                displayName: p1.displayName
            },
            member2: {
                ...x.member2,
                displayName: p2.displayName
            }
        };
    }
    else {
        return x;
    }
}

export function computeChatDisplayName(chat: SidebarChatDescriptor, mUser: UserProfile) {
    let friendlyName: string;
    let icon: JSX.Element;
    let skip: boolean = false;

    if (chat.isDM) {
        const member1 = chat.member1;
        const member2 = chat.member2;
        let otherOnline;

        if (member1.profileId !== mUser.id) {
            friendlyName = member1.displayName;
            otherOnline = member1.isOnline;
        }
        else if (member2) {
            friendlyName = member2.displayName;
            otherOnline = member2.isOnline;
        }
        else {
            skip = true;
            friendlyName = "<unknown>";
        }

        icon = <i className={`fa${otherOnline ? 's' : 'r'} fa-circle ${otherOnline ? 'online' : ''}`}></i>;
    }
    else {
        // Group chat - use chat friendly name from Twilio
        friendlyName = chat.friendlyName;
        icon = <i className="fas fa-hashtag"></i>;
    }

    return { friendlyName, skip, icon };
}


function subscribeToDMMemberJoin(
    memberJoinedlisteners: Map<string, () => void>,
    mChat: Chat,
    conf: Conference,
    dispatchUpdate: React.Dispatch<ChatsGroupUpdate | ChatsGroupUpdate[]>
): (value: string | ChatDescriptor) => Promise<void> {
    return async (chatIdOrDesc) => {
        // WATCH_TODO
        // if (x.isDM && !x.member2) {
        //     memberJoinedlisteners.set(x.id,
        //         await mChat.channelEventOn(x.id, "memberJoined", async (mem) => {
        //             const profile = await UserProfile.get(mem.profileId, conf.id);
        //             assert(profile);
        //             dispatchUpdate({
        //                 action: "updateActiveChats",
        //                 chats: [
        //                     {
        //                         ...x,
        //                         member2: {
        //                             isOnline: await mem.getOnlineStatus(),
        //                             profileId: mem.profileId,
        //                             displayName: profile.displayName
        //                         }
        //                     } as SidebarChatDescriptor
        //                 ]
        //             });
        //         }));
        // }
    };
}

interface Props {
    minSearchLength: number
}

export default function ChatsGroup(props: Props) {
    const conf = useConference();
    const mUser = useMaybeUserProfile();
    const mChat = useMaybeChat();
    const logger = useLogger("ChatsGroup");
    const [state, dispatchUpdate] = useReducer(nextSidebarState, {
        tasks: new Set([
            "loadingChats",
            "loadingActiveChats"
        ] as ChatGroupTasks[]),
        isOpen: true,
        chatSearch: null,
        allChats: null,
        activeChats: null,
        filteredChats: [],
    });

    logger.enable();

    // Initial fetch of active chats
    useEffect(() => {
        let cancel: () => void = () => { };
        const memberJoinedlisteners: Map<string, () => void> = new Map();

        async function updateChats() {
            try {
                if (mChat) {
                    const chatsP = makeCancelable(mChat.listWatchedChats());
                    cancel = chatsP.cancel;
                    const chats = await chatsP.promise;
                    await Promise.all(chats.map(subscribeToDMMemberJoin(memberJoinedlisteners, mChat, conf, dispatchUpdate)));
                    const chatsWithName: Array<SidebarChatDescriptor>
                        = await Promise.all(chats.map(x => upgradeChatDescriptor(conf, x)));

                    dispatchUpdate({
                        action: "updateActiveChats",
                        chats: chatsWithName
                    });
                }
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        updateChats();

        return () => {
            if (mChat) {
                const keys = memberJoinedlisteners.keys();
                for (const key of keys) {
                    const listener = memberJoinedlisteners.get(key) as () => void;
                    mChat.channelEventOff(key, "memberJoined", listener);
                }
            }
            cancel();
        }
    }, [conf, conf.id, mChat]);

    // Initial fetch of all chats
    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateChats() {
            try {
                if (mChat) {
                    const chatsP = makeCancelable(mChat.listAllChats());
                    cancel = chatsP.cancel;
                    const chats = await chatsP.promise;
                    dispatchUpdate({
                        action: "updateAllChats",
                        chats
                    });
                }
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        updateChats();

        return cancel;
    }, [mChat]);

    // Update filtered chat results
    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateFiltered() {
            try {
                const promise = makeCancelable(filterChats(
                    state.allChats ?? [],
                    state.chatSearch,
                    props.minSearchLength
                ));
                cancel = promise.cancel;
                const filteredChats = await promise.promise;
                const filteredChatsWithNames: Array<SidebarChatDescriptor>
                    = await Promise.all(filteredChats.map(x => upgradeChatDescriptor(conf, x)));

                dispatchUpdate({
                    action: "updateFilteredChats",
                    chats: filteredChatsWithNames
                });
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        updateFiltered();

        return cancel;
    }, [conf, conf.id, props.minSearchLength, state.allChats, state.chatSearch]);

    // Subscribe to chat events
    useEffect(() => {
        if (mChat) {
            const chatService = mChat;

            const listeners: Map<ServiceEventNames, () => void> = new Map();
            const memberJoinedlisteners: Map<string, () => void> = new Map();

            async function attach() {
                try {
                    listeners.set("userUpdated", await chatService.serviceEventOn("userUpdated", async (u) => {
                        if (u.updateReasons.includes("friendlyName") ||
                            u.updateReasons.includes("online") ||
                            u.updateReasons.includes("attributes")) {
                            function updateDescriptor(x: SidebarChatDescriptor): SidebarChatDescriptor {
                                if (x.isDM) {
                                    const m1 = { ...x.member1 };
                                    if (m1.profileId === u.user.profileId) {
                                        m1.isOnline = u.user.isOnline;
                                    }

                                    const m2 = { ...x.member2 };
                                    if (m2 && m2.profileId === u.user.profileId) {
                                        m2.isOnline = u.user.isOnline;
                                    }

                                    return {
                                        ...x,
                                        member1: m1,
                                        member2: m2
                                    }
                                }
                                else {
                                    return x;
                                }
                            }

                            dispatchUpdate({
                                action: "updateChatDescriptors",
                                f: updateDescriptor
                            });
                        }
                    }));
                }
                catch (e) {
                    if (!e.isCanceled) {
                        throw e;
                    }
                }
            }

            attach();

            return function detach() {
                const keys1 = listeners.keys();
                for (const key of keys1) {
                    const listener = listeners.get(key) as () => void;
                    chatService.serviceEventOff(key, listener);
                }

                const keys2 = memberJoinedlisteners.keys();
                for (const key of keys2) {
                    const listener = memberJoinedlisteners.get(key) as () => void;
                    chatService.channelEventOff(key, "memberJoined", listener);
                }
            };
        }
        return () => { };
    }, [conf, logger, mChat]);

    // WATCH_TODO: useDataSubscription on TextChat (add/update/delete) and WatchedItems
    // WATCH_TODO: Subscribe to new messages from a chat

    let chatsExpander: JSX.Element = <></>;

    const chatsButtons: Array<ButtonSpec> = [
        {
            type: "search", label: "Search all chats", icon: "fas fa-search",
            onSearch: (event) => {
                dispatchUpdate({ action: "searchChats", search: event.target.value });
                return event.target.value;
            },
            onSearchOpen: () => {
                dispatchUpdate({ action: "setIsOpen", isOpen: true });
            },
            onSearchClose: () => {
                dispatchUpdate({ action: "searchChats", search: null });
            }
        },
        { type: "link", label: "Show all chats", icon: "fas fa-users", url: "/chat" },
        { type: "link", label: "Create new chat", icon: "fas fa-plus", url: "/chat/new" }
    ];

    if (mUser) {
        let chatEl: JSX.Element;
        const chatSearchValid = state.chatSearch && state.chatSearch.length >= props.minSearchLength;
        if ((state.activeChats && state.activeChats.length > 0)
            || (chatSearchValid && state.allChats && state.filteredChats.length > 0)) {

            let chats: Array<SidebarChatDescriptor>;
            if (state.chatSearch && state.chatSearch.length >= props.minSearchLength) {
                chats = state.filteredChats;
                // TODO: Include searching all user profiles by display name
            }
            else {
                // We know this can't be null, but TS can't quite figure that out
                chats = state.activeChats as Array<SidebarChatDescriptor>;
            }

            chats = chats.sort((x, y) => x.friendlyName.localeCompare(y.friendlyName));

            const chatMenuItems: MenuGroupItems = [];
            for (const chat of chats) {
                const { friendlyName, skip, icon } = computeChatDisplayName(chat, mUser);

                // TODO: "New messages in this chat" boldification
                if (!skip) {
                    chatMenuItems.push({
                        key: chat.id,
                        element:
                            <MenuItem
                                title={friendlyName}
                                label={friendlyName}
                                icon={icon}
                                action={`/chat/${chat.id}`}
                                bold={false} />
                    });
                }
            }

            chatEl = <MenuGroup items={chatMenuItems} />;
        }
        else {
            chatEl = <>
                {state.allChats ? <></> : <LoadingSpinner />}
                <MenuGroup items={[{
                    key: "whole-chat",
                    element: <MenuItem title="View all chats" label="All chats" icon={<i className="fas fa-users"></i>} action="/chat" bold={true} />
                }]} />
            </>;
        }

        chatsExpander
            = <MenuExpander
                title="Chats"
                isOpen={state.isOpen}
                buttons={chatsButtons}
                onOpenStateChange={() => dispatchUpdate({ action: "setIsOpen", isOpen: !state.isOpen })}
            >
                {chatEl}
            </MenuExpander>;

        return chatsExpander;
    }
    else {
        return <></>;
    }
}
