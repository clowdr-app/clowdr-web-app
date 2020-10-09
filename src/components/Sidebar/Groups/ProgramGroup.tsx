import React, { useCallback, useEffect, useReducer } from 'react';
import useConference from '../../../hooks/useConference';
import useMaybeUserProfile from '../../../hooks/useMaybeUserProfile';
import MenuExpander, { ButtonSpec } from "../Menu/MenuExpander";
import MenuGroup from '../Menu/MenuGroup';
import ProgramList from '../ProgramList';
import MenuItem from '../Menu/MenuItem';
import { ProgramSession, ProgramSessionEvent } from '@clowdr-app/clowdr-db-schema';
import { makeCancelable, removeNull } from '@clowdr-app/clowdr-db-schema/build/Util';
import { DataDeletedEventDetails, DataUpdatedEventDetails } from '@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache';
import useDataSubscription from '../../../hooks/useDataSubscription';
import { LoadingSpinner } from '../../LoadingSpinner/LoadingSpinner';

interface Props {
    minSearchLength: number;
}

type ProgramGroupTasks
    = "loadingSessionsAndEvents";

interface ProgramGroupState {
    tasks: Set<ProgramGroupTasks>;

    isOpen: boolean;

    programSearch: string | null;

    sessions: Array<ProgramSession> | null;
    events: Array<ProgramSessionEvent> | null;

    filteredSessions: Array<ProgramSession>;
    filteredEvents: Array<ProgramSessionEvent>;
}

type ProgramGroupUpdate
    = { action: "updateSessions"; sessions: Array<ProgramSession> }
    | { action: "updateEvents"; events: Array<ProgramSessionEvent> }
    | { action: "updateFilteredSessions"; sessions: Array<ProgramSession> }
    | { action: "updateFilteredEvents"; events: Array<ProgramSessionEvent> }
    | { action: "deleteSessions"; sessions: Array<string> }
    | { action: "deleteEvents"; events: Array<string> }
    | { action: "searchProgram"; search: string | null }
    | { action: "setIsOpen"; isOpen: boolean }
    ;

async function filterSessionsAndEvents(
    allSessions: Array<ProgramSession>,
    allEvents: Array<ProgramSessionEvent>,
    _search: string | null,
    minSearchLength: number): Promise<[Array<ProgramSession>, Array<ProgramSessionEvent>]> {
    if (_search && _search.length >= minSearchLength) {
        const search = _search.toLowerCase();

        const sessions: Array<ProgramSession> = removeNull(await Promise.all(allSessions.map(async x => {
            // const trackName = (await x.track).name;
            const sessionTitle = x.title;

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
        const now = Date.now();
        const twoHours = 2 * 60 * 60 * 1000;
        const endLimit = now;
        const startLimit = now + twoHours;

        const sessions = allSessions
            .filter(x => x.endTime.getTime() >= endLimit
                && x.startTime.getTime() <= startLimit);

        // TODO: When do we want to display events in the sidebar? CSCW didn't want them - maybe make this configurable
        // const events = allEvents
        //     .filter(x => x.endTime.getTime() >= endLimit
        //         && x.startTime.getTime() <= startLimit);

        // const eventsSessionIds = [...new Set(events.map(x => x.sessionId))];
        // sessions = sessions.filter(x => !eventsSessionIds.includes(x.id));

        return [sessions, []];
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
        filteredEvents: currentState.filteredEvents
    };

    let sessionsOrEventsUpdated = false;

    function doUpdate(update: ProgramGroupUpdate) {
        switch (update.action) {
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
    const [state, dispatchUpdate] = useReducer(nextSidebarState, {
        tasks: new Set([
            "loadingSessionsAndEvents"
        ] as ProgramGroupTasks[]),

        isOpen: true,

        programSearch: null,

        sessions: null,
        events: null,

        filteredSessions: [],
        filteredEvents: []
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
    }, [props.minSearchLength, state.events, state.programSearch, state.sessions]);

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

    let programExpander: JSX.Element = <></>;

    const programButtons: Array<ButtonSpec> = [
        {
            type: "search", label: "Search whole program", icon: "fas fa-search",
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
        let program: JSX.Element;
        if (state.sessions && state.events &&
            (state.filteredSessions.length > 0 || state.filteredEvents.length > 0)) {
            const programTimeBoundaries: Array<number> = [
                0.1, 0.5, 3, 15, 30, 60, 120
            ];

            program = <ProgramList
                sessions={state.filteredSessions}
                events={state.filteredEvents}
                timeBoundaries={programTimeBoundaries} />;
        }
        else {
            program = <>
                {state.sessions && state.events ? <span className="menu-group">No upcoming events in the next 2 hours.</span> : <LoadingSpinner />}
                <MenuGroup items={[{
                    key: "whole-program",
                    element: <MenuItem title="View whole program" label="Whole program" icon={<i className="far fa-calendar"></i>} action="/program" bold={true} />
                }]} />
            </>;
        }

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
