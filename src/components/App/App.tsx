import Parse from "parse";
import React, { useState, useEffect, useCallback, useReducer } from 'react';
import './App.scss';
import Page from '../Page/Page';
import LocalStorage_Conference from '../../classes/LocalStorage/Conference';
import Sidebar from '../Sidebar/Sidebar';
import ConferenceContext from '../../contexts/ConferenceContext';
import UserProfileContext from '../../contexts/UserProfileContext';
import useLogger from '../../hooks/useLogger';
import Caches from "clowdr-db-schema/src/classes/DataLayer/Cache";
import { Conference, UserProfile, _User } from "clowdr-db-schema/src/classes/DataLayer";
import assert from "assert";
import { useHistory } from "react-router-dom";
import { LoadingSpinner } from "../LoadingSpinner/LoadingSpinner";
import Chat from "../../classes/Chat/Chat";
import { ISimpleEvent } from "strongly-typed-events";
import { DataUpdatedEventDetails } from "clowdr-db-schema/src/classes/DataLayer/Cache/Cache";
import { makeCancelable } from "clowdr-db-schema/src/classes/Util";

interface Props {
}

type AppTasks
    = "beginLoadConference"
    | "beginLoadCurrentUser"
    | "loadingConference"
    | "loadingCurrentUser";

interface AppState {
    tasks: Set<AppTasks>;
    conferenceId: string | null;
    conference: Conference | null;
    profile: UserProfile | null,
    sessionToken: string | null
}

type AppUpdate
    = { action: "beginningLoadCurrentUser" }
    | { action: "beginningLoadConference" }
    | { action: "setConference", conference: Conference | null }
    | { action: "setUserProfile", data: { profile: UserProfile, sessionToken: string } | null; }
    ;

function nextAppState(currentState: AppState, updates: AppUpdate | Array<AppUpdate>): AppState {
    const nextState = {
        tasks: new Set(currentState.tasks),
        conferenceId: currentState.conference?.id ?? null,
        conference: currentState.conference,
        profile: currentState.profile,
        sessionToken: currentState.sessionToken
    };

    function doUpdate(update: AppUpdate) {
        switch (update.action) {
            case "beginningLoadConference":
                nextState.tasks.delete("beginLoadConference");
                nextState.tasks.add("loadingConference");
                break;
            case "beginningLoadCurrentUser":
                nextState.tasks.delete("beginLoadCurrentUser");
                nextState.tasks.add("loadingCurrentUser");
                break;
            case "setConference":
                nextState.tasks.delete("beginLoadConference");
                nextState.tasks.delete("loadingConference");
                nextState.conferenceId = update.conference?.id ?? null;
                nextState.conference = update.conference;
                break;
            case "setUserProfile":
                nextState.tasks.delete("beginLoadCurrentUser");
                nextState.tasks.delete("loadingCurrentUser");
                nextState.profile = update.data?.profile ?? null;
                nextState.sessionToken = update.data?.sessionToken ?? null;
                break;
        }
    }

    if (updates instanceof Array) {
        updates.forEach(doUpdate);
    }
    else {
        doUpdate(updates);
    }

    LocalStorage_Conference.currentConferenceId = nextState.conferenceId;

    if (nextState.conference && nextState.sessionToken && nextState.profile) {
        Chat.initialise(nextState.conference, nextState.profile, nextState.sessionToken);
    }
    else {
        Chat.teardown();
    }

    return nextState;
}

/**
 * The main application component.
 * 
 * Must be wrapped in either a <BrowserRouter> or <MemoryRouter> component (the
 * latter for testing).
 * 
 * The App level takes care of the cache, conference and user contexts (/state).
 * Underlying components can rely entirely on the respective hooks.
 */
export default function App(props: Props) {
    const logger = useLogger("App");
    const history = useHistory();

    const [appState, dispatchAppUpdate] = useReducer(nextAppState, {
        tasks: new Set(["beginLoadConference", "beginLoadCurrentUser"] as Array<AppTasks>),
        conferenceId: LocalStorage_Conference.currentConferenceId,
        conference: null,
        profile: null,
        sessionToken: null
    });

    // logger.enable();

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(true /*TODO: Revert to false.*/);

    // TODO: Top-level <Route /> detection of `/conference/:confId` to bypass the conference selector

    // Initial update of conference
    useEffect(() => {
        async function updateConference() {
            if (appState.tasks.has("beginLoadConference")) {
                dispatchAppUpdate({ action: "beginningLoadConference" });

                let _conference: Conference | null = null;

                if (appState.conferenceId) {
                    try {
                        _conference = await Conference.get(appState.conferenceId);
                    }
                    catch (e) {
                        _conference = null;
                        logger.error(e);
                    }
                }

                dispatchAppUpdate({ action: "setConference", conference: _conference });
            }
        }

        updateConference();
    }, [appState.conferenceId, appState.tasks, logger]);

    // Initial update of (current) user profile
    useEffect(() => {
        async function updateUser() {
            if (appState.tasks.has("beginLoadCurrentUser")) {
                dispatchAppUpdate({ action: "beginningLoadCurrentUser" });

                Parse.User.currentAsync().then(async user => {
                    // It turns out the `user.id` can come back `undefined` when the
                    // Parse API thinks you're logged in but the user has been
                    // deleted in the database.
                    let profile = null;
                    let sessionToken = null;

                    if (appState.conferenceId) {
                        if (user && user.id) {
                            let cache = await Caches.get(appState.conferenceId);
                            await cache.updateUserAuthenticated({ authed: true, sessionToken: user.getSessionToken() });

                            profile = await UserProfile.getByUserId(user.id, appState.conferenceId);
                            if (profile) {
                                sessionToken = user.getSessionToken();
                            }
                        }
                    }

                    dispatchAppUpdate({
                        action: "setUserProfile",
                        data: profile && sessionToken
                            ? { profile: profile, sessionToken: sessionToken }
                            : null
                    });
                }).catch(reason => {
                    logger.error("Failed to get current user from Parse.", reason);

                    dispatchAppUpdate({ action: "setUserProfile", data: null });
                });;
            }
        }

        updateUser();
    }, [appState.conferenceId, appState.tasks, logger]);

    // Subscribe to data updates for conference and profile
    const onConferenceUpdated = useCallback(function _onConferenceUpdated(value: DataUpdatedEventDetails<"Conference">) {
        dispatchAppUpdate({ action: "setConference", conference: value.object as Conference });
    }, []);
    const onUserProfileUpdated = useCallback(function _onUserProfileUpdated(sessionToken: string, value: DataUpdatedEventDetails<"UserProfile">) {
        dispatchAppUpdate({
            action: "setUserProfile",
            data: {
                profile: value.object as UserProfile,
                sessionToken: sessionToken
            }
        });
    }, []);

    useEffect(() => {
        let cancel: () => void = () => { };
        let unsubscribe: () => void = () => { };
        async function subscribeToUpdates() {
            if (appState.conference && appState.profile && appState.sessionToken) {
                let sessionToken = appState.sessionToken;
                try {
                    const promises: [
                        Promise<ISimpleEvent<DataUpdatedEventDetails<"Conference">>>,
                        Promise<ISimpleEvent<DataUpdatedEventDetails<"UserProfile">>>
                    ] = [
                            Conference.onDataUpdated(appState.conference.id),
                            UserProfile.onDataUpdated(appState.conference.id)
                        ];
                    const promise = makeCancelable(Promise.all(promises));
                    cancel = promise.cancel;
                    const [ev1, ev2] = await promise.promise;
                    const unsubscribe1 = ev1.subscribe(onConferenceUpdated);
                    const unsubscribe2 = ev2.subscribe(
                        (ev) => onUserProfileUpdated(sessionToken, ev));
                    unsubscribe = () => {
                        unsubscribe1();
                        unsubscribe2();
                    };
                }
                catch (e) {
                    if (!e.isCanceled) {
                        throw e;
                    }
                }
                finally {
                    cancel = () => { };
                }
            }
        }

        subscribeToUpdates();

        return () => {
            unsubscribe();
            cancel();
        }
    }, [appState.conference, appState.profile, appState.sessionToken, onConferenceUpdated, onUserProfileUpdated]);

    const doLogin = useCallback(async function _doLogin(email: string, password: string): Promise<boolean> {
        try {
            assert(appState.conference);

            let parseUser = await _User.logIn(email, password);
            let cache = await Caches.get(appState.conference.id);
            await cache.updateUserAuthenticated({ authed: true, sessionToken: parseUser.sessionToken });
            let profile = await UserProfile.getByUserId(parseUser.user.id, appState.conference.id);

            dispatchAppUpdate({
                action: "setUserProfile",
                data: profile
                    ? { profile: profile, sessionToken: parseUser.sessionToken }
                    : null
            });

            return !!profile;
        }
        catch (e) {
            logger.error(e);
            dispatchAppUpdate({ action: "setUserProfile", data: null });
            return false;
        }
    }, [appState.conference, logger]);

    const doLogout = useCallback(async function _doLogout() {
        try {
            if (appState.conference) {
                let cache = await Caches.get(appState.conference.id);
                cache.updateUserAuthenticated({ authed: false });
            }
        }
        finally {
            dispatchAppUpdate([
                { action: "setConference", conference: null },
                { action: "setUserProfile", data: null }
            ]);

            await Parse.User.logOut();
        }
    }, [appState.conference]);

    const failedToLoadConferences = useCallback(async function _failedToLoadConferences(reason: any): Promise<void> {
        // This is most likely to occur during testing when the session token
        // is invalidated by regeneration of the test database.
        let handled = false;
        if (typeof reason === "string") {
            if (reason.match(/ParseError: 209 Invalid session token/ig)?.length) {
                handled = true;

                // We have to iterate by index, which means removal has to be
                // done in two stages (otherwise the length of the store would
                // change while we're iterating over it).
                let keys: Array<string> = [];
                for (let i = 0; i < localStorage.length; i++) {
                    let key = localStorage.key(i);
                    if (key?.match(/parse/ig)?.length) {
                        keys.push(key);
                    }
                }
                for (let key of keys) {
                    localStorage.removeItem(key);
                }

                // Refresh the page so that Parse reloads
                history.go(0);
            }
        }

        if (!handled) {
            logger.error(`Failed to load conferences! ${reason}`);
        }
    }, [history, logger]);

    const selectConference = useCallback(async function _selectConference(id: string | null): Promise<boolean> {
        let conference: Conference | null = null;
        try {
            if (id) {
                conference = await Conference.get(id);
            }
        }
        catch (e) {
            logger.error(e);
        }

        dispatchAppUpdate({ action: "setConference", conference: conference });

        return conference !== null;
    }, [logger]);

    const toggleSidebar = useCallback(async function _toggleSidebar(): Promise<void> {
        setSidebarOpen(!sidebarOpen);
    }, [sidebarOpen]);

    const appClassNames = ["app"];

    if (appState.tasks.size > 0) {
        const appClassName = appClassNames.reduce((x, y) => `${x} ${y}`);
        return <div className={appClassName}>
            <LoadingSpinner />
        </div>;
    }
    else {
        // The main page element - this is where the bulk of content goes
        const page = <Page
            doLogin={doLogin}
            failedToLoadConferences={failedToLoadConferences}
            selectConference={selectConference}
        />;
        // The sidebar element - only rendered if a conference is selected (user may
        // still be logged out though).
        let sidebar = <></>;

        // Only render the sidebar if we are in a conference This allows
        //  not-logged-in access to some conference elements (e.g.a public program
        //  or welcome page) but reduces our work as we don't have to design an
        //  'empty' sidebar for when no conference is selected.
        if (appState.conference) {
            sidebar = <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} doLogout={doLogout} />;
            appClassNames.push(sidebarOpen ? "sidebar-open" : "sidebar-closed");
        }

        // TODO: Wrap this in an error boundary to handle null cache/conference/user and unexpected errors

        const appClassName = appClassNames.reduce((x, y) => `${x} ${y}`);
        // Hint: `user` could be null - see also, `useUser` and `useMaybeUser` hooks
        return <div className={appClassName}>
            <ConferenceContext.Provider value={appState.conference}>
                <UserProfileContext.Provider value={appState.profile}>
                    {sidebar}
                    {page}
                </UserProfileContext.Provider>
            </ConferenceContext.Provider>
        </div>;
    }
}
