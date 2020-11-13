import React, { useCallback, useEffect, useMemo, useReducer } from 'react';
import useConference from '../../../hooks/useConference';
import useMaybeUserProfile from '../../../hooks/useMaybeUserProfile';
import MenuExpander, { ButtonSpec } from "../Menu/MenuExpander";
import MenuGroup from '../Menu/MenuGroup';
import ProgramList, { ProgramSessionWithStartEnd } from '../ProgramList';
import MenuItem from '../Menu/MenuItem';
import { ProgramSession, ProgramSessionEvent, WatchedItems } from '@clowdr-app/clowdr-db-schema';
import { makeCancelable, removeNull } from '@clowdr-app/clowdr-db-schema/build/Util';
import { DataDeletedEventDetails, DataUpdatedEventDetails } from '@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache';
import useDataSubscription from '../../../hooks/useDataSubscription';
import { LoadingSpinner } from '../../LoadingSpinner/LoadingSpinner';
import useSafeAsync from '../../../hooks/useSafeAsync';
import { addNotification } from '../../../classes/Notifications/Notifications';
import { useLocation } from 'react-router-dom';

interface Props {
    minSearchLength: number;
    onItemClicked?: () => void;
}

type ProgramGroupTasks
    = "loadingSessionsAndEvents";

interface ProgramGroupState {
    tasks: Set<ProgramGroupTasks>;

    isOpen: boolean;

    programSearch: string | null;

    sessions: Array<ProgramSession> | null;
    events: Array<ProgramSessionEvent> | null;

    filteredSessions: Array<ProgramSessionWithStartEnd>;
    filteredEvents: Array<ProgramSessionEvent>;

    watchedSessionIds: Array<string> | null;
    watchedEventIds: Array<string> | null;
    watchedTrackIds: Array<string> | null;

    notifiedSessionIds: Array<string>;
    notifiedEventIds: Array<string>;

    lastRefresh: number;
}

type ProgramGroupUpdate
    = { action: "updateSessions"; sessions: Array<ProgramSession> }
    | { action: "updateEvents"; events: Array<ProgramSessionEvent> }
    | { action: "updateFilteredSessions"; sessions: Array<ProgramSessionWithStartEnd> }
    | { action: "updateFilteredEvents"; events: Array<ProgramSessionEvent> }
    | { action: "deleteSessions"; sessions: Array<string> }
    | { action: "deleteEvents"; events: Array<string> }
    | { action: "searchProgram"; search: string | null }
    | { action: "setIsOpen"; isOpen: boolean }
    | { action: "setWatchedSessionIds"; ids: Array<string> | null }
    | { action: "setWatchedEventIds"; ids: Array<string> | null }
    | { action: "setWatchedTrackIds"; ids: Array<string> | null }
    | { action: "addNotifiedSessionIds"; ids: Array<string> }
    | { action: "addNotifiedEventIds"; ids: Array<string> }
    | { action: "updateTime" }
    ;

async function filterSessionsAndEvents(
    allSessions: Array<ProgramSessionWithStartEnd>,
    allEvents: Array<ProgramSessionEvent>,
    _search: string | null,
    minSearchLength: number): Promise<[Array<ProgramSessionWithStartEnd>, Array<ProgramSessionEvent>]> {

    if (_search && _search.length >= minSearchLength) {
        const search = _search.toLowerCase();

        const sessions: Array<ProgramSessionWithStartEnd> = removeNull(await Promise.all(allSessions.map(async x => {
            // const trackName = (await x.track).name;
            const sessionTitle = x.session.title;

            if (// !!trackName.toLowerCase().match(search)?.length ||
                !!sessionTitle.toLowerCase().match(search)?.length) {
                return x;
            }
            return null;
        })));

        const events: Array<ProgramSessionEvent> = removeNull(await Promise.all(allEvents.map(async x => {
            const item = await x.item;
            const itemTitle = item.title;
            // const authorNames = (await item.authorPerons).map(y => y.name);
            // const trackName = (await x.track).name;
            // const sessionTitle = (await x.session).title;

            if (!!itemTitle.toLowerCase().match(search)?.length
                // || !!trackName.toLowerCase().match(search)?.length
                // || !!sessionTitle.toLowerCase().match(search)?.length
                // || authorNames.reduce<boolean>((acc, y) => acc || (!!y.toLowerCase().match(search)?.length), false)
            ) {
                return x;
            }
            return null;
        })));

        return [sessions, events];
    }
    else {
        // const eventsSessionIds = [...new Set(allEvents.map(x => x.sessionId))];
        // sessions = sessions.filter(x => !eventsSessionIds.includes(x.id));

        /*[sessions, events]*/
        return [allSessions, []];
    }
}

function nextSidebarState(currentState: ProgramGroupState, updates: ProgramGroupUpdate | Array<ProgramGroupUpdate>): ProgramGroupState {
    const nextState: ProgramGroupState = {
        tasks: new Set(currentState.tasks),
        isOpen: currentState.isOpen,
        programSearch: currentState.programSearch,
        sessions: currentState.sessions,
        events: currentState.events,
        filteredSessions: currentState.filteredSessions,
        filteredEvents: currentState.filteredEvents,
        watchedSessionIds: currentState.watchedSessionIds,
        watchedEventIds: currentState.watchedEventIds,
        watchedTrackIds: currentState.watchedTrackIds,
        notifiedSessionIds: currentState.notifiedSessionIds,
        notifiedEventIds: currentState.notifiedEventIds,
        lastRefresh: currentState.lastRefresh
    };

    let sessionsOrEventsUpdated = false;

    function doUpdate(update: ProgramGroupUpdate) {
        switch (update.action) {
            case "updateTime":
                nextState.lastRefresh = Date.now();
                break;
            case "searchProgram":
                nextState.programSearch = update.search?.length ? update.search : null;
                break;
            case "setIsOpen":
                nextState.isOpen = update.isOpen;
                break;
            case "updateEvents":
                {
                    const changes = [...update.events];
                    const updatedIds = changes.map(x => x.id);
                    nextState.events = nextState.events?.map(x => {
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
                    nextState.events = nextState.events?.concat(changes) ?? changes;
                    sessionsOrEventsUpdated = true;
                }
                break;
            case "updateSessions":
                {
                    const changes = [...update.sessions];
                    const updatedIds = changes.map(x => x.id);
                    nextState.sessions = nextState.sessions?.map(x => {
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
                    nextState.sessions = nextState.sessions?.concat(changes) ?? changes;
                    sessionsOrEventsUpdated = true;
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
            case "updateFilteredSessions":
                nextState.filteredSessions = update.sessions;
                break;
            case "updateFilteredEvents":
                nextState.filteredEvents = update.events;
                break;
            case "setWatchedSessionIds":
                nextState.watchedSessionIds = update.ids;
                break;
            case "setWatchedEventIds":
                nextState.watchedEventIds = update.ids;
                break;
            case "setWatchedTrackIds":
                nextState.watchedTrackIds = update.ids;
                break;
            case "addNotifiedSessionIds":
                nextState.notifiedSessionIds = nextState.notifiedSessionIds.concat(update.ids);
                break;
            case "addNotifiedEventIds":
                nextState.notifiedEventIds = nextState.notifiedEventIds.concat(update.ids);
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

    return nextState;
}

export default function ProgramGroup(props: Props) {
    const conf = useConference();
    const mUser = useMaybeUserProfile();
    const location = useLocation();
    const [state, dispatchUpdate] = useReducer(nextSidebarState, {
        tasks: new Set([
            "loadingSessionsAndEvents"
        ] as ProgramGroupTasks[]),

        isOpen: true,

        programSearch: null,

        sessions: null,
        events: null,

        filteredSessions: [],
        filteredEvents: [],

        watchedSessionIds: [],
        watchedEventIds: [],
        watchedTrackIds: [],

        notifiedSessionIds: [],
        notifiedEventIds: [],

        lastRefresh: Date.now()
    });

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
                    throw e;
                }
            }
        }

        updateSessionsAndEvents();

        return cancel;
    }, [conf.id]);

    const notifyWatchedItems = useCallback(async function _notifyWatchedItems() {
        const now = Date.now();
        const newNotifiedSessionIds: Array<string> = [];
        const newNotifiedEventIds: Array<string> = [];

        if (state.sessions) {
            for (const session of state.sessions) {
                if (!state.notifiedSessionIds.includes(session.id)) {
                    const limit = 1000 * 60 * 1.5;
                    const earliestStart = state.events?.filter(e => e.sessionId === session.id)?.reduce((r, e) => r.getTime() < e.startTime.getTime() ? r : e.startTime, new Date(32503680000000)).getTime() ?? limit + 1;
                    const dist = Math.abs(earliestStart - now);
                    if (dist < limit) {
                        const path = `/session/${session.id}`;
                        if (!location.pathname.includes(path)) {
                            if (state.watchedSessionIds?.includes(session.id)
                                || state.watchedTrackIds?.includes(session.trackId)) {
                                newNotifiedSessionIds.push(session.id);
                                addNotification(`"${session.title}" is about to start.`, {
                                    url: path,
                                    text: `Go to session`
                                });
                            }
                        }
                    }
                }
            }
        }
        if (state.events) {
            for (const event of state.events) {
                if (!state.notifiedEventIds.includes(event.id)) {
                    const dist = Math.abs(event.startTime.getTime() - now);
                    if (dist < 1000 * 60 * 1.5) {
                        const path = `/event/${event.id}`;
                        if (!location.pathname.includes(path)) {
                            const track = await event.track;
                            if (state.watchedEventIds?.includes(event.id)
                                || state.watchedTrackIds?.includes(track.id)) {
                                newNotifiedEventIds.push(event.id);
                                const item = await event.item;
                                addNotification(`"${item.title}" is about to start.`, {
                                    url: path,
                                    text: `Go to event`
                                });
                            }
                        }
                    }
                }
            }
        }

        const updates: Array<ProgramGroupUpdate> = [];
        if (newNotifiedSessionIds.length > 0) {
            updates.push({ action: "addNotifiedSessionIds", ids: newNotifiedSessionIds });
        }
        if (newNotifiedEventIds.length > 0) {
            updates.push({ action: "addNotifiedEventIds", ids: newNotifiedEventIds });
        }
        if (updates.length > 0) {
            dispatchUpdate(updates);
        }
    }, [location.pathname, state.events, state.notifiedEventIds, state.notifiedSessionIds, state.sessions, state.watchedEventIds, state.watchedSessionIds, state.watchedTrackIds]);

    // Refresh the view every few mins
    useEffect(() => {
        const intervalId = setInterval(() => {
            dispatchUpdate({
                action: "updateTime"
            });

            notifyWatchedItems();
        }, 1000 * 60 * 1 /* 1 mins */);

        return () => {
            clearInterval(intervalId);
        }
    }, [notifyWatchedItems, state.programSearch]);

    useEffect(() => {
        notifyWatchedItems();
    }, [notifyWatchedItems]);

    const sessionsWSE: ProgramSessionWithStartEnd[] | null = useMemo(() => {
        if (state.sessions && state.events) {
            const events = state.events;
            return state.sessions.map(session => {
                const eventsOfSession = events.filter(x => x.sessionId === session.id);
                return {
                    session,
                    earliestStart: eventsOfSession.reduce((r, e) => r.getTime() < e.startTime.getTime() ? r : e.startTime, new Date(32503680000000)),
                    latestEnd: eventsOfSession.reduce((r, e) => r.getTime() > e.endTime.getTime() ? r : e.endTime, new Date(0))
                };
            });
        }
        return null;
    }, [state.events, state.sessions]);
    // Update filtered program results
    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateFiltered() {
            try {
                const promise = makeCancelable(filterSessionsAndEvents(
                    sessionsWSE ?? [],
                    state.events ?? [],
                    state.programSearch,
                    props.minSearchLength
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
    }, [props.minSearchLength, sessionsWSE, state.events, state.programSearch]);

    // Fetch watched items
    useSafeAsync(async () => mUser?.watched ?? null, (data: WatchedItems | null) => {
        if (data) {
            dispatchUpdate([
                {
                    action: "setWatchedSessionIds",
                    ids: data.watchedSessions
                },
                {
                    action: "setWatchedEventIds",
                    ids: data.watchedEvents
                },
                {
                    action: "setWatchedTrackIds",
                    ids: data.watchedTracks
                }
            ]);
        }
    }, [mUser?.watchedId], "ProgramGroup:setWatched*");

    // Subscribe to watched items changes
    const watchedId = mUser?.watchedId;
    const onWatchedItemsUpdated = useCallback(function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        for (const object of update.objects) {
            if (object.id === watchedId) {
                const data = object as WatchedItems;
                dispatchUpdate([
                    {
                        action: "setWatchedSessionIds",
                        ids: data.watchedSessions
                    },
                    {
                        action: "setWatchedEventIds",
                        ids: data.watchedEvents
                    },
                    {
                        action: "setWatchedTrackIds",
                        ids: data.watchedTracks
                    }
                ]);
            }
        }
    }, [watchedId]);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, !state.watchedSessionIds, conf);


    // Subscribe to program data events

    const onSessionUpdated = useCallback(function _onSessionUpdated(ev: DataUpdatedEventDetails<"ProgramSession">) {
        dispatchUpdate({ action: "updateSessions", sessions: ev.objects as ProgramSession[] });
    }, []);

    const onEventUpdated = useCallback(function _onEventUpdated(ev: DataUpdatedEventDetails<"ProgramSessionEvent">) {
        dispatchUpdate({ action: "updateEvents", events: ev.objects as ProgramSessionEvent[] });
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

    let programExpander: JSX.Element = <></>;

    const programButtons: Array<ButtonSpec> = [
        {
            type: "search", label: "Search for a title", icon: "fas fa-search",
            placeholder: "Search (titles only)...",
            onSearch: (event) => {
                dispatchUpdate({ action: "searchProgram", search: event.target.value });
                return event.target.value;
            },
            onSearchOpen: () => {
                dispatchUpdate({ action: "setIsOpen", isOpen: true });
            },
            onSearchClose: () => {
                dispatchUpdate({ action: "searchProgram", search: null });
            }
        },
        { type: "link", label: "Show whole program", icon: "far fa-calendar", url: "/program" },
        // TODO: If admin: { type: "link", label: "Create new program event", icon: "fa-plus", url: "/chat/new" }
    ];

    if (mUser) {
        let _program: JSX.Element | null = null;
        if (state.sessions && state.events &&
            (state.filteredSessions.length > 0 || state.filteredEvents.length > 0)) {
            const programTimeBoundaries: Array<number> = [
                0.1, 0.5, 3, 15, 30, 60, 120
            ];

            const now = Date.now();
            const twoHours = 2 * 60 * 60 * 1000;
            const endLimit = now;
            const startLimit = now + twoHours;

            const sessions
                = state.programSearch && state.programSearch.length >= props.minSearchLength
                    ? state.filteredSessions
                    : state.filteredSessions
                        .filter(x =>
                            x.latestEnd.getTime() >= endLimit
                            && x.earliestStart.getTime() <= startLimit
                        );

            const events
                = state.programSearch && state.programSearch.length >= props.minSearchLength
                    ? state.filteredEvents
                    : state.filteredEvents
                        .filter(x =>
                            x.endTime.getTime() >= endLimit
                            && x.startTime.getTime() <= startLimit
                        );

            if (events.length > 0 || sessions.length > 0) {
                _program = <ProgramList
                    sessions={sessions}
                    events={events}
                    timeBoundaries={programTimeBoundaries}
                    watchedSessions={state.watchedSessionIds ?? undefined}
                    watchedEvents={state.watchedEventIds ?? undefined}
                />;
            }
        }

        if (!_program) {
            _program = <>
                {state.sessions && state.events ? <span className="menu-group">No upcoming events in the next 2 hours.</span> : <LoadingSpinner />}
                <MenuGroup items={[{
                    key: "whole-program",
                    element: <MenuItem title="View whole program" label="Whole program" icon={<i className="far fa-calendar"></i>} action="/program" bold={true} onClick={props.onItemClicked} />
                }]} />
            </>;
        }

        const program = _program;

        programExpander
            = <MenuExpander
                title="Program"
                isOpen={state.isOpen}
                buttons={programButtons}
                onOpenStateChange={() => dispatchUpdate({ action: "setIsOpen", isOpen: !state.isOpen })}
            >
                {program}
            </MenuExpander>;
    }

    return programExpander;
}
