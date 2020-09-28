import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import './Sidebar.scss';
import useConference from '../../hooks/useConference';
import useMaybeUserProfile from '../../hooks/useMaybeUserProfile';
import FooterLinks from '../FooterLinks/FooterLinks';
import { Link } from 'react-router-dom';
import MenuExpander, { ButtonSpec } from "./Menu/MenuExpander";
import MenuGroup, { MenuGroupItems } from './Menu/MenuGroup';
import Program from './Program';
import MenuItem from './Menu/MenuItem';
import { Conference, ProgramSession, ProgramSessionEvent, UserProfile } from 'clowdr-db-schema/src/classes/DataLayer';
import { makeCancelable } from 'clowdr-db-schema/src/classes/Util';
import { DataDeletedEventDetails, DataUpdatedEventDetails } from 'clowdr-db-schema/src/classes/DataLayer/Cache/Cache';
import useMaybeChat from '../../hooks/useMaybeChat';
import { ChatDescriptor, MemberDescriptor } from '../../classes/Chat';
import assert from 'assert';
import { ServiceEventNames } from '../../classes/Chat/Services/Twilio/ChatService';
import Chat from '../../classes/Chat/Chat';
import useDataSubscription from '../../hooks/useDataSubscription';

interface Props {
    open: boolean,
    toggleSidebar?: () => void
    doLogout?: () => void
}

type SidebarTasks
    = "loadingSessionsAndEvents"
    | "loadingActiveChats"
    | "loadingAllChats";

type SidebarChatDescriptor = {
    sid: string;
    friendlyName: string;
    status: 'invited' | 'joined' | undefined;
} & ({
    isDM: false;
} | {
    isDM: true;
    member1: MemberDescriptor & { displayName: string };
    member2?: MemberDescriptor & { displayName: string };
});

interface SidebarState {
    tasks: Set<SidebarTasks>;

    chatsIsOpen: boolean;
    roomsIsOpen: boolean;
    programIsOpen: boolean;

    chatSearch: string | null;
    roomSearch: string | null;
    programSearch: string | null;

    activeChats: Array<SidebarChatDescriptor> | null;
    allChats: Array<ChatDescriptor> | null;
    sessions: Array<ProgramSession> | null;
    events: Array<ProgramSessionEvent> | null;

    filteredChats: Array<SidebarChatDescriptor>;
    filteredSessions: Array<ProgramSession>;
    filteredEvents: Array<ProgramSessionEvent>;
}

type SidebarUpdate
    = { action: "updateSessions"; sessions: Array<ProgramSession> }
    | { action: "updateEvents"; events: Array<ProgramSessionEvent> }

    | { action: "updateFilteredSessions"; sessions: Array<ProgramSession> }
    | { action: "updateFilteredEvents"; events: Array<ProgramSessionEvent> }

    | { action: "updateAllChats"; chats: Array<ChatDescriptor> }
    | { action: "updateActiveChats"; chats: Array<SidebarChatDescriptor> }
    | { action: "updateFilteredChats"; chats: Array<SidebarChatDescriptor> }

    | { action: "deleteSessions"; sessions: Array<string> }
    | { action: "deleteEvents"; events: Array<string> }

    | { action: "deleteFromActiveChats"; chats: Array<string> }
    | { action: "deleteFromAllChats"; chats: Array<string> }

    | { action: "searchChats"; search: string | null }
    | { action: "searchRooms"; search: string | null }
    | { action: "searchProgram"; search: string | null }

    | { action: "setChatsIsOpen"; isOpen: boolean }
    | { action: "setRoomsIsOpen"; isOpen: boolean }
    | { action: "setProgramIsOpen"; isOpen: boolean }
    ;

const minSearchLength = 3;

async function filterSessionsAndEvents(
    allSessions: Array<ProgramSession>,
    allEvents: Array<ProgramSessionEvent>,
    _search: string | null): Promise<[Array<ProgramSession>, Array<ProgramSessionEvent>]> {
    if (_search && _search.length >= minSearchLength) {
        const search = _search.toLowerCase();

        const sessions: Array<ProgramSession> = [];
        for (const x of allSessions) {
            const trackName = (await x.track).name;
            const sessionTitle = x.title;

            if (!!trackName.toLowerCase().match(search)?.length
                || !!sessionTitle.toLowerCase().match(search)?.length) {
                sessions.push(x);
            }
        }

        const events: Array<ProgramSessionEvent> = [];
        for (const x of allEvents) {
            const item = await x.item;
            const itemTitle = item.title;
            const authorNames = (await item.authors).map(y => y.name);
            const trackName = (await x.track).name;
            const sessionTitle = (await x.session).title;

            if (!!itemTitle.toLowerCase().match(search)?.length
                || !!trackName.toLowerCase().match(search)?.length
                || !!sessionTitle.toLowerCase().match(search)?.length
                || authorNames.reduce<boolean>((acc, y) => acc || (!!y.toLowerCase().match(search)?.length), false)) {
                events.push(x);
            }
        }

        return [sessions, events];
    }
    else {
        const now = Date.now();
        const twoHours = 2 * 60 * 60 * 1000;
        const endLimit = now;
        const startLimit = now + twoHours;

        let sessions = allSessions
            .filter(x => x.endTime.getTime() >= endLimit
                && x.startTime.getTime() <= startLimit);

        const events = allEvents
            .filter(x => x.endTime.getTime() >= endLimit
                && x.startTime.getTime() <= startLimit);

        const eventsSessionIds = [...new Set(events.map(x => x.sessionId))];

        sessions = sessions.filter(x => !eventsSessionIds.includes(x.id));

        return [sessions, events];
    }
}

async function filterChats(
    allChats: Array<ChatDescriptor>,
    _search: string | null): Promise<Array<ChatDescriptor>> {
    if (_search && _search.length >= minSearchLength) {
        const search = _search.toLowerCase();
        return allChats.filter(x => x.friendlyName.toLowerCase().includes(search));
    }
    else {
        return allChats;
    }
}

function nextSidebarState(currentState: SidebarState, updates: SidebarUpdate | Array<SidebarUpdate>): SidebarState {
    const nextState: SidebarState = {
        tasks: new Set(currentState.tasks),

        chatsIsOpen: currentState.chatsIsOpen,
        roomsIsOpen: currentState.roomsIsOpen,
        programIsOpen: currentState.programIsOpen,

        chatSearch: currentState.chatSearch,
        roomSearch: currentState.roomSearch,
        programSearch: currentState.programSearch,

        allChats: currentState.allChats,
        activeChats: currentState.activeChats,
        sessions: currentState.sessions,
        events: currentState.events,

        filteredChats: currentState.filteredChats,
        filteredSessions: currentState.filteredSessions,
        filteredEvents: currentState.filteredEvents
    };

    let sessionsOrEventsUpdated = false;
    let allChatsUpdated = false;
    let activeChatsUpdated = false;

    function doUpdate(update: SidebarUpdate) {
        switch (update.action) {
            case "searchChats":
                nextState.chatSearch = update.search?.length ? update.search : null;
                break;
            case "searchProgram":
                nextState.programSearch = update.search?.length ? update.search : null;
                break;
            case "searchRooms":
                nextState.roomSearch = update.search?.length ? update.search : null;
                break;
            case "setChatsIsOpen":
                nextState.chatsIsOpen = update.isOpen;
                break;
            case "setProgramIsOpen":
                nextState.programIsOpen = update.isOpen;
                break;
            case "setRoomsIsOpen":
                nextState.roomsIsOpen = update.isOpen;
                break;
            case "updateEvents":
                {
                    const updatedIds = update.events.map(x => x.id);
                    nextState.events = nextState.events?.map(x => {
                        const idx = updatedIds.indexOf(x.id);
                        if (idx > -1) {
                            const y = update.events[idx];
                            updatedIds.splice(idx, 1);
                            update.events.splice(idx, 1);
                            return y;
                        }
                        else {
                            return x;
                        }
                    }) ?? null;
                    nextState.events = nextState.events?.concat(update.events) ?? update.events;
                    sessionsOrEventsUpdated = true;
                }
                break;
            case "updateSessions":
                {
                    const updatedIds = update.sessions.map(x => x.id);
                    nextState.sessions = nextState.sessions?.map(x => {
                        const idx = updatedIds.indexOf(x.id);
                        if (idx > -1) {
                            const y = update.sessions[idx];
                            updatedIds.splice(idx, 1);
                            update.sessions.splice(idx, 1);
                            return y;
                        }
                        else {
                            return x;
                        }
                    }) ?? null;
                    nextState.sessions = nextState.sessions?.concat(update.sessions) ?? update.sessions;
                    sessionsOrEventsUpdated = true;
                }
                break;
            case "updateAllChats":
                {
                    const updatedIds = update.chats.map(x => x.sid);
                    nextState.allChats = nextState.allChats?.map(x => {
                        const idx = updatedIds.indexOf(x.sid);
                        if (idx > -1) {
                            const y = update.chats[idx];
                            updatedIds.splice(idx, 1);
                            update.chats.splice(idx, 1);
                            return y;
                        }
                        else {
                            return x;
                        }
                    }) ?? null;
                    nextState.allChats = nextState.allChats?.concat(update.chats) ?? update.chats;
                    allChatsUpdated = true;
                }
                break;
            case "updateActiveChats":
                {
                    const updatedIds = update.chats.map(x => x.sid);
                    nextState.activeChats = nextState.activeChats?.map(x => {
                        const idx = updatedIds.indexOf(x.sid);
                        if (idx > -1) {
                            const y = update.chats[idx];
                            updatedIds.splice(idx, 1);
                            update.chats.splice(idx, 1);
                            return y;
                        }
                        else {
                            return x;
                        }
                    }) ?? null;
                    nextState.activeChats = nextState.activeChats?.concat(update.chats) ?? update.chats;
                    activeChatsUpdated = true;
                }
                break;
            case "deleteEvents":
                nextState.events = nextState.events?.filter(x => !update.events.includes(x.id)) ?? null;
                sessionsOrEventsUpdated = true;
                break;
            case "deleteSessions":
                nextState.sessions = nextState.sessions?.filter(x => !update.sessions.includes(x.id)) ?? null;
                sessionsOrEventsUpdated = true;
                break;
            case "deleteFromActiveChats":
                nextState.activeChats = nextState.activeChats?.filter(x => !update.chats.includes(x.sid)) ?? null;
                activeChatsUpdated = true;
                break;
            case "deleteFromAllChats":
                nextState.allChats = nextState.allChats?.filter(x => !update.chats.includes(x.sid)) ?? null;
                allChatsUpdated = true;
                break;

            case "updateFilteredSessions":
                nextState.filteredSessions = update.sessions;
                break;
            case "updateFilteredEvents":
                nextState.filteredEvents = update.events;
                break;
            case "updateFilteredChats":
                nextState.filteredChats = update.chats;
                break;
        }
    }

    if (updates instanceof Array) {
        updates.forEach(doUpdate);
    }
    else {
        doUpdate(updates);
    }

    if (sessionsOrEventsUpdated) {
        if (nextState.sessions && nextState.events) {
            nextState.tasks.delete("loadingSessionsAndEvents");
        }
        else {
            nextState.filteredEvents = [];
            nextState.filteredSessions = [];
        }
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
            (x.member2 ? UserProfile.get(x.member2.profileId, conf.id) : null)
        ]);
        assert(p1);
        return {
            ...x,
            member1: {
                ...x.member1,
                displayName: p1.displayName
            },
            member2: x.member2 && p2 ? {
                ...x.member2,
                displayName: p2.displayName
            } : undefined
        };
    }
    else {
        return x;
    }
}


function subscribeToDMMemberJoin(
    memberJoinedlisteners: Map<string, () => void>,
    mChat: Chat,
    conf: Conference,
    dispatchUpdate: React.Dispatch<SidebarUpdate | SidebarUpdate[]>
): (value: ChatDescriptor) => Promise<void> {
    return async (x) => {
        if (x.isDM && !x.member2) {
            memberJoinedlisteners.set(x.sid,
                await mChat.channelEventOn(x.sid, "memberJoined", async (mem) => {
                    const profile = await UserProfile.get(mem.profileId, conf.id);
                    assert(profile);
                    dispatchUpdate({
                        action: "updateActiveChats",
                        chats: [
                            {
                                ...x,
                                member2: {
                                    isOnline: await mem.getOnlineStatus(),
                                    profileId: mem.profileId,
                                    displayName: profile.displayName
                                }
                            } as SidebarChatDescriptor
                        ]
                    });
                }));
        }
    };
}

function Sidebar(props: Props) {
    const conf = useConference();
    const mUser = useMaybeUserProfile();
    const mChat = useMaybeChat();
    const burgerButtonRef = useRef<HTMLButtonElement>(null);
    const [state, dispatchUpdate] = useReducer(nextSidebarState, {
        tasks: new Set([
            "loadingSessionsAndEvents",
            "loadingChats",
            "loadingActiveChats"
        ] as SidebarTasks[]),

        chatsIsOpen: true,
        roomsIsOpen: true,
        programIsOpen: true,

        chatSearch: null,
        roomSearch: null,
        programSearch: null,

        allChats: null,
        activeChats: null,
        sessions: null,
        events: null,

        filteredChats: [],
        filteredSessions: [],
        filteredEvents: []
    });

    // TODO: When sidebar is occupying full window (e.g. on mobile), close it
    // when the user clicks a link.

    useEffect(() => {
        burgerButtonRef.current?.focus();
    }, [burgerButtonRef, props.open]);

    // TODO: Use 'M' key as a shortcut to open/close menu?
    // TODO: Use 'C/R/P' to jump focus to menu expanders
    // TODO: Document shortcut keys prominently on the /help page

    // Initial fetch of active chats
    useEffect(() => {
        let cancel: () => void = () => { };
        const memberJoinedlisteners: Map<string, () => void> = new Map();

        async function updateChats() {
            try {
                if (mChat) {
                    const chatsP = makeCancelable(mChat.listActiveChats());
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

    // Initial fetch of complete program
    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateSessionsAndEvents() {
            try {
                const promises: [Promise<Array<ProgramSession>>, Promise<Array<ProgramSessionEvent>>]
                    = [ProgramSession.getAll(conf.id), ProgramSessionEvent.getAll(conf.id)];
                const allPromise = Promise.all(promises);
                const wrappedPromise = makeCancelable(allPromise);
                cancel = wrappedPromise.cancel;

                const [allSessions, allEvents] = await wrappedPromise.promise;

                dispatchUpdate([
                    {
                        action: "updateSessions",
                        sessions: allSessions
                    }, {
                        action: "updateEvents",
                        events: allEvents
                    }]);
            }
            catch (e) {
                if (!e.isCanceled) {

                    dispatchUpdate([
                        {
                            action: "updateSessions",
                            sessions: []
                        }, {
                            action: "updateEvents",
                            events: []
                        }]);

                    throw e;
                }
            }
        }

        updateSessionsAndEvents();

        return cancel;
    }, [conf.id]);

    // Refresh the view every few mins
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (!state.programSearch) {
                dispatchUpdate({
                    action: "searchProgram",
                    search: null
                });
            }
        }, 1000 * 60 * 3 /* 3 mins */);

        return () => {
            clearInterval(intervalId);
        }
    }, [state.programSearch]);

    // Update filtered program results
    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateFiltered() {
            try {
                const promise = makeCancelable(filterSessionsAndEvents(
                    state.sessions ?? [],
                    state.events ?? [],
                    state.programSearch
                ));
                cancel = promise.cancel;
                const [filteredSessions, filteredEvents]
                    = await promise.promise;
                dispatchUpdate([
                    { action: "updateFilteredSessions", sessions: filteredSessions },
                    { action: "updateFilteredEvents", events: filteredEvents }
                ]);
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        updateFiltered();

        return cancel;
    }, [state.events, state.programSearch, state.sessions]);

    // Update filtered chat results
    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateFiltered() {
            try {
                const promise = makeCancelable(filterChats(
                    state.allChats ?? [],
                    state.chatSearch
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
    }, [conf, conf.id, state.allChats, state.chatSearch]);


    // Subscribe to program data events

    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        dispatchUpdate({ action: "updateSessions", sessions: [ev.object as ProgramSession] });
    }, []);

    const onEventUpdated = useCallback(function _onEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        dispatchUpdate({ action: "updateEvents", events: [ev.object as ProgramSessionEvent] });
    }, []);

    const onSessionDeleted = useCallback(function _onSessionDeleted(ev: DataDeletedEventDetails<"ProgramSession">) {
        dispatchUpdate({ action: "deleteSessions", sessions: [ev.objectId] });
    }, []);

    const onEventDeleted = useCallback(function _onEventDeleted(ev: DataDeletedEventDetails<"ProgramSessionEvent">) {
        dispatchUpdate({ action: "deleteEvents", events: [ev.objectId] });
    }, []);

    useDataSubscription(
        "ProgramSession",
        onSessionUpdated,
        onSessionDeleted,
        state.tasks.has("loadingSessionsAndEvents"),
        conf);

    useDataSubscription(
        "ProgramSessionEvent",
        onEventUpdated,
        onEventDeleted,
        state.tasks.has("loadingSessionsAndEvents"),
        conf);

    // Subscribe to chat events
    useEffect(() => {
        if (mChat && !state.tasks.has("loadingActiveChats")) {
            const chatService = mChat;

            const listeners: Map<ServiceEventNames, () => void> = new Map();
            const memberJoinedlisteners: Map<string, () => void> = new Map();

            async function attach() {
                try {
                    listeners.set("channelJoined", await chatService.serviceEventOn("channelJoined", async (ch) => {
                        await subscribeToDMMemberJoin(memberJoinedlisteners, chatService, conf, dispatchUpdate)(ch);

                        if (!ch.isDM || ch.member2) {
                            dispatchUpdate({
                                action: "updateActiveChats",
                                chats: [await upgradeChatDescriptor(conf, ch)]
                            });
                        }
                    }));

                    listeners.set("channelLeft", await chatService.serviceEventOn("channelLeft", (ch) => {
                        dispatchUpdate({
                            action: "deleteFromActiveChats",
                            chats: [ch.sid]
                        });
                    }));

                    listeners.set("channelAdded", await chatService.serviceEventOn("channelAdded", (ch) => {
                        dispatchUpdate({
                            action: "updateAllChats",
                            chats: [ch]
                        });
                    }));

                    listeners.set("channelRemoved", await chatService.serviceEventOn("channelRemoved", (ch) => {
                        dispatchUpdate([
                            {
                                action: "deleteFromActiveChats",
                                chats: [ch.sid]
                            },
                            {
                                action: "deleteFromAllChats",
                                chats: [ch.sid]
                            }
                        ]);
                    }));

                    listeners.set("channelUpdated", await chatService.serviceEventOn("channelUpdated", async (ch) => {
                        if (ch.updateReasons.includes("attributes")
                            || ch.updateReasons.includes("friendlyName")
                            || ch.updateReasons.includes("lastConsumedMessageIndex")
                            || ch.updateReasons.includes("lastMessage")
                            || ch.updateReasons.includes("uniqueName")
                            || ch.updateReasons.includes("status")
                            || ch.updateReasons.includes("state"))
                            dispatchUpdate([
                                {
                                    action: "updateActiveChats",
                                    chats: [await upgradeChatDescriptor(conf, ch.channel)]
                                },
                                {
                                    action: "updateAllChats",
                                    chats: [ch.channel]
                                }
                            ]);
                    }));

                    listeners.set("userUpdated", await chatService.serviceEventOn("userUpdated", async (u) => {
                        if (u.updateReasons.includes("friendlyName") ||
                            u.updateReasons.includes("online") ||
                            u.updateReasons.includes("attributes")) {
                            const updates: SidebarUpdate[] = [];
                            function updateDescriptor(x: SidebarChatDescriptor): SidebarChatDescriptor {
                                if (x.isDM) {
                                    const m1 = { ...x.member1 };
                                    if (m1.profileId === u.user.profileId) {
                                        m1.isOnline = u.user.isOnline;
                                    }

                                    const m2 = x.member2 ? { ...x.member2 } : undefined;
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

                            if (state.activeChats) {
                                const newActiveChats = state.activeChats.map(updateDescriptor);
                                updates.push({
                                    action: "updateActiveChats",
                                    chats: newActiveChats
                                });
                            }

                            if (state.allChats) {
                                updates.push({
                                    action: "updateFilteredChats",
                                    chats: state.filteredChats.map(updateDescriptor)
                                });
                            }

                            dispatchUpdate(updates);
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
    }, [conf, mChat, state.activeChats, state.allChats, state.filteredChats, state.tasks]);

    const sideBarButton = <div className="sidebar-button">
        <button
            aria-label="Open Menu"
            onClick={props.toggleSidebar}
            className={props.open ? " change" : ""}
            ref={burgerButtonRef}
        >
            <div className="bar1"></div>
            <div className="bar2"></div>
            <div className="bar3"></div>
        </button>
    </div>;

    // TODO: It may be useful to `useMemo` the rendered menu groups to stop
    //       them interfering / re-rendering every time one of them changes

    if (props.open) {
        const sideBarHeading = <h1 aria-level={1}><Link to="/" aria-label="Conference homepage">{conf.shortName}</Link></h1>;
        const headerBar = <div className="sidebar-header">
            {sideBarButton}
            {sideBarHeading}
        </div>

        let mainMenuGroup: JSX.Element = <></>;
        let chatsExpander: JSX.Element = <></>;
        let roomsExpander: JSX.Element = <></>;
        let programExpander: JSX.Element = <></>;

        const chatsButtons: Array<ButtonSpec> = [
            {
                type: "search", label: "Search all chats", icon: "fa-search",
                onSearch: (event) => {
                    dispatchUpdate({ action: "searchChats", search: event.target.value });
                    return event.target.value;
                },
                onSearchOpen: () => {
                    dispatchUpdate({ action: "setChatsIsOpen", isOpen: true });
                },
                onSearchClose: () => {
                    dispatchUpdate({ action: "searchChats", search: null });
                }
            },
            { type: "link", label: "Show all chats", icon: "fa-globe-europe", url: "/chat" },
            { type: "link", label: "Create new chat", icon: "fa-plus", url: "/chat/new" }
        ];
        const roomsButtons: Array<ButtonSpec> = [
            {
                type: "search", label: "Search all rooms", icon: "fa-search",
                onSearch: (event) => {
                    dispatchUpdate({ action: "searchRooms", search: event.target.value });
                    return event.target.value;
                },
                onSearchOpen: () => {
                    dispatchUpdate({ action: "setRoomsIsOpen", isOpen: true });
                },
                onSearchClose: () => {
                    dispatchUpdate({ action: "searchRooms", search: null });
                }
            },
            { type: "link", label: "Show all rooms", icon: "fa-globe-europe", url: "/room" },
            { type: "link", label: "Create new room", icon: "fa-plus", url: "/chat/new" }
        ];
        const programButtons: Array<ButtonSpec> = [
            {
                type: "search", label: "Search whole program", icon: "fa-search",
                onSearch: (event) => {
                    dispatchUpdate({ action: "searchProgram", search: event.target.value });
                    return event.target.value;
                },
                onSearchOpen: () => {
                    dispatchUpdate({ action: "setProgramIsOpen", isOpen: true });
                },
                onSearchClose: () => {
                    dispatchUpdate({ action: "searchProgram", search: null });
                }
            },
            { type: "link", label: "Show whole program", icon: "fa-globe-europe", url: "/program" },
            // TODO: If admin: { type: "link", label: "Create new program event", icon: "fa-plus", url: "/chat/new" }
        ];

        if (mUser) {
            const mainMenuItems: MenuGroupItems = [
                { key: "watched-items", element: <MenuItem title="Watched items" label="Watched items" action="/watched" /> },
                { key: "profile", element: <MenuItem title="Profile" label="Profile" action="/profile" /> },
                { key: "contact-moderators", element: <MenuItem title="Contact moderators" label="Contact moderators" action="/moderators" /> },
                // TODO: If admin: { key: "admin", element: <MenuItem title="Admin tools" label="Admin tools" action="/admin"><></></MenuItem> }
            ];
            mainMenuGroup = <MenuGroup items={mainMenuItems} />;

            let chatEl: JSX.Element;
            const chatSearchValid = state.chatSearch && state.chatSearch.length >= minSearchLength;
            if ((state.activeChats && state.activeChats.length > 0)
                || (chatSearchValid && state.allChats && state.filteredChats.length > 0)) {

                let chats: Array<SidebarChatDescriptor>;
                if (state.chatSearch && state.chatSearch.length >= minSearchLength) {
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
                    // TODO: For DMs, user presence (hollow/solid-green dot)
                    if (!skip) {
                        chatMenuItems.push({
                            key: chat.sid,
                            element:
                                <MenuItem
                                    title={friendlyName}
                                    label={friendlyName}
                                    icon={icon}
                                    action={`/chat/${chat.sid}`}
                                    bold={false} />
                        });
                    }
                }

                chatEl = <MenuGroup items={chatMenuItems} />;
            }
            else {
                chatEl = <>
                    {state.allChats ? <span className="menu-group">No chats to show.</span> : <></>}
                    <MenuGroup items={[{
                        key: "whole-chat",
                        element: <MenuItem title="View all chats" label="All chats" icon={<i className="fas fa-globe-europe"></i>} action="/chat" bold={true} />
                    }]} />
                </>;
            }

            chatsExpander
                = <MenuExpander
                    title="Chats"
                    isOpen={state.chatsIsOpen}
                    buttons={chatsButtons}
                    onOpenStateChange={() => dispatchUpdate({ action: "setChatsIsOpen", isOpen: !state.chatsIsOpen })}
                >
                    {chatEl}
                </MenuExpander>;

            // TODO: Generate room items from database (inc. any current search)
            const roomMenuItems: MenuGroupItems = [
                {
                    key: "room-1",
                    element:
                        <MenuItem title="Breakout room 1" label="Breakout room 1" icon={<i className="fas fa-video"></i>} action="/room/1">
                            <ul>
                                <li>Benjamin Pierce</li>
                                <li>Crista Lopes</li>
                                <li>Jonathan Bell</li>
                            </ul>
                        </MenuItem>
                },
                {
                    key: "room-2",
                    element:
                        <MenuItem title="Breakout room 2" label="Breakout room 2" icon={<i className="fas fa-video"></i>} action="/room/2">
                            <ul>
                                <li>Ed Nutting</li>
                                <li>Harry Goldstein</li>
                                <li>Alan Turing</li>
                                <li>The one and only SPJ</li>
                                <li>Stephanie Weirich</li>
                            </ul>
                        </MenuItem>
                },
                {
                    key: "room-3",
                    element:
                        <MenuItem title="Large room" label="Large room" icon={<i className="fas fa-video"></i>} action="/room/3">
                            <ul>
                                <li>Alonzo Church</li>
                                <li>Ada Lovelace</li>
                                <li className="plus-bullet">11 more people...</li>
                            </ul>
                        </MenuItem>
                },
            ];
            roomsExpander
                = <MenuExpander
                    title="Rooms"
                    isOpen={state.roomsIsOpen}
                    buttons={roomsButtons}
                    onOpenStateChange={() => dispatchUpdate({ action: "setRoomsIsOpen", isOpen: !state.roomsIsOpen })}
                >
                    <MenuGroup items={roomMenuItems} />
                </MenuExpander>;
        }

        let program: JSX.Element;
        if (state.sessions && state.events &&
            (state.filteredSessions.length > 0 || state.filteredEvents.length > 0)) {
            const programTimeBoundaries: Array<number> = [
                0, 15, 30, 60, 120
            ];

            program = <Program
                sessions={state.filteredSessions}
                events={state.filteredEvents}
                timeBoundaries={programTimeBoundaries} />;
        }
        else {
            program = <>
                {state.sessions && state.events ? <span className="menu-group">No events to show.</span> : <></>}
                <MenuGroup items={[{
                    key: "whole-program",
                    element: <MenuItem title="View whole program" label="Whole program" icon={<i className="fas fa-globe-europe"></i>} action="/program" bold={true} />
                }]} />
            </>;
        }

        programExpander
            = <MenuExpander
                title="Program"
                isOpen={state.programIsOpen}
                buttons={programButtons}
                onOpenStateChange={() => dispatchUpdate({ action: "setProgramIsOpen", isOpen: !state.programIsOpen })}
            >
                {program}
            </MenuExpander>;

        return <div className="sidebar">
            {headerBar}
            <div className="sidebar-scrollable">
                <div className="menu">
                    {mainMenuGroup}

                    {chatsExpander}

                    {roomsExpander}

                    {programExpander}
                </div>

                <FooterLinks doLogout={mUser ? props.doLogout : undefined} />
            </div>
        </div>;
    }
    else {
        return sideBarButton;
    }
}

export default Sidebar;

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

