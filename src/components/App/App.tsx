import Parse from "parse";
import React, { useState, useEffect, useCallback, useReducer, useMemo } from 'react';
import './App.scss';
import Page from '../Page/Page';
import LocalStorage_Conference from '../../classes/LocalStorage/Conference';
import Sidebar from '../Sidebar/Sidebar';
import ConferenceContext from '../../contexts/ConferenceContext';
import UserProfileContext from '../../contexts/UserProfileContext';
import ChatContext from '../../contexts/ChatContext';
import useLogger from '../../hooks/useLogger';
import Caches from "clowdr-db-schema/src/classes/DataLayer/Cache";
import { Conference, UserProfile, _User } from "clowdr-db-schema/src/classes/DataLayer";
import assert from "assert";
import { useHistory } from "react-router-dom";
import { LoadingSpinner } from "../LoadingSpinner/LoadingSpinner";
import Chat from "../../classes/Chat/Chat";
import { DataUpdatedEventDetails } from "clowdr-db-schema/src/classes/DataLayer/Cache/Cache";
import useDataSubscription from "../../hooks/useDataSubscription";

type AppTasks
    = "beginLoadConference"
    | "beginLoadCurrentUser"
    | "loadingConference"
    | "loadingCurrentUser";

interface AppState {
    tasks: Set<AppTasks>;
    conferenceId: string | null;
    conference: Conference | null;
    profile: UserProfile | null;
    sessionToken: string | null;
}

type AppUpdate
    = { action: "beginningLoadCurrentUser" }
    | { action: "beginningLoadConference" }
    | { action: "setConference", conference: Conference | null }
    | { action: "setUserProfile", data: { profile: UserProfile, sessionToken: string } | null; }
    | { action: "chatUpdated" }
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
export default function App() {
    const logger = useLogger("App");
    const history = useHistory();

    const [appState, dispatchAppUpdate] = useReducer(nextAppState, {
        tasks: new Set(["beginLoadConference", "beginLoadCurrentUser"] as Array<AppTasks>),
        conferenceId: LocalStorage_Conference.currentConferenceId,
        conference: null,
        profile: null,
        sessionToken: null
    });
    const [chatReady, setChatReady] = useState(false);

    // logger.enable();

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

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
                            const cache = await Caches.get(appState.conferenceId);
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
                            ? { profile, sessionToken }
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

    // Update chat
    useEffect(() => {
        async function updateChat() {
            if (appState.conference && appState.sessionToken && appState.profile) {
                Chat.setup(appState.conference, appState.profile, appState.sessionToken)
                    .then(ok => {
                        setChatReady(ok);
                    })
                    .catch(err => {
                        // TODO: Upgrade to console.error once chat is implemented
                        console.warn("Error during chat initialisation.", err);
                        setChatReady(false);
                    });
            }
            else {
                Chat.teardown()
                    .then(() => {
                        setChatReady(false);
                    })
                    .catch(err => {
                        // TODO: Upgrade to console.error once chat is implemented
                        console.warn("Error during chat teardown.", err);
                        setChatReady(false);
                    });
            }
        }

        updateChat();
    }, [appState.conference, appState.profile, appState.sessionToken]);

    // Subscribe to data updates for conference and profile
    const onConferenceUpdated = useCallback(function _onConferenceUpdated(value: DataUpdatedEventDetails<"Conference">) {
        if (appState.conference && value.object.id === appState.conference.id) {
            dispatchAppUpdate({ action: "setConference", conference: value.object as Conference });
        }
        else if (appState.conferenceId === value.object.id) {
            dispatchAppUpdate({ action: "setConference", conference: value.object as Conference });
        }
    }, [appState.conference, appState.conferenceId]);
    const onUserProfileUpdated = useCallback(function _onUserProfileUpdated(value: DataUpdatedEventDetails<"UserProfile">) {
        if (appState.sessionToken && appState.profile && value.object.id === appState.profile.id) {
            dispatchAppUpdate({
                action: "setUserProfile",
                data: {
                    profile: value.object as UserProfile,
                    sessionToken: appState.sessionToken
                }
            });
        }
    }, [appState.profile, appState.sessionToken]);

    useDataSubscription(
        "Conference",
        onConferenceUpdated,
        () => { },
        appState.tasks.has("beginLoadConference") || appState.tasks.has("loadingConference"),
        appState.conference);

    useDataSubscription(
        "UserProfile",
        onUserProfileUpdated,
        () => { },
        appState.tasks.has("beginLoadCurrentUser") || appState.tasks.has("loadingCurrentUser"),
        appState.conference);

    const doLogin = useCallback(async function _doLogin(email: string, password: string): Promise<boolean> {
        try {
            assert(appState.conference);

            const parseUser = await _User.logIn(email, password);
            const cache = await Caches.get(appState.conference.id);
            await cache.updateUserAuthenticated({ authed: true, sessionToken: parseUser.sessionToken });
            const profile = await UserProfile.getByUserId(parseUser.user.id, appState.conference.id);

            dispatchAppUpdate({
                action: "setUserProfile",
                data: profile
                    ? { profile, sessionToken: parseUser.sessionToken }
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
                const cache = await Caches.get(appState.conference.id);
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
                const keys: Array<string> = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.match(/parse/ig)?.length) {
                        keys.push(key);
                    }
                }
                for (const key of keys) {
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

        dispatchAppUpdate({ action: "setConference", conference });

        return conference !== null;
    }, [logger]);

    const toggleSidebar = useCallback(async function _toggleSidebar(): Promise<void> {
        setSidebarOpen(!sidebarOpen);
    }, [sidebarOpen]);

    const appClassNames = ["app"];

    // The main page element - this is where the bulk of content goes
    const page = useMemo(() => <Page
        doLogin={doLogin}
        failedToLoadConferences={failedToLoadConferences}
        selectConference={selectConference}
    />, [doLogin, failedToLoadConferences, selectConference]);

    if (appState.tasks.size > 0) {
        const appClassName = appClassNames.reduce((x, y) => `${x} ${y}`);
        return <div className={appClassName}>
            <LoadingSpinner />
        </div>;
    }
    else {
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
                    <ChatContext.Provider value={chatReady ? Chat.instance() : null}>
                        {sidebar}
                        {page}
                    </ChatContext.Provider>
                </UserProfileContext.Provider>
            </ConferenceContext.Provider>
        </div>;
    }
}
