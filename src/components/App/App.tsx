import Parse from "parse";
import React, { useState, useEffect, useCallback, useReducer, useMemo } from 'react';
import './App.scss';
import Page from '../Page/Page';
import LocalStorage_Conference from '../../classes/LocalStorage/Conference';
import Sidebar from '../Sidebar/Sidebar';
import ConferenceContext from '../../contexts/ConferenceContext';
import UserProfileContext from '../../contexts/UserProfileContext';
import ChatContext from '../../contexts/ChatContext';
import VideoContext from '../../contexts/VideoContext';
import UserRolesContext from "../../contexts/UserRolesContext";
import EmojiContext from '../../contexts/EmojiContext';
import useLogger from '../../hooks/useLogger';
import Caches from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache";
import { Conference, UserProfile, _Role, _User } from "@clowdr-app/clowdr-db-schema";
import assert from "assert";
import { useHistory } from "react-router-dom";
import { LoadingSpinner } from "../LoadingSpinner/LoadingSpinner";
import Chat from "../../classes/Chat/Chat";
import { DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../hooks/useDataSubscription";
import Video from "../../classes/Video/Video";
import { addError } from "../../classes/Notifications/Notifications";
import { handleParseFileURLWeirdness } from "../../classes/Utils";
import AppBlocker from "../AppBlocker/AppBlocker";

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
    userRoles: { isAdmin: boolean, isManager: boolean };
}

type AppUpdate
    = { action: "beginningLoadCurrentUser" }
    | { action: "beginningLoadConference" }
    | { action: "setConference", conference: Conference | null }
    | { action: "setUserProfile", data: { profile: UserProfile, sessionToken: string } | null; }
    | { action: "chatUpdated" }
    | { action: "setUserRoles", roles: { isAdmin: boolean, isManager: boolean } }
    ;

function nextAppState(currentState: AppState, updates: AppUpdate | Array<AppUpdate>): AppState {
    const nextState = {
        tasks: new Set(currentState.tasks),
        conferenceId: currentState.conference?.id ?? null,
        conference: currentState.conference,
        profile: currentState.profile,
        sessionToken: currentState.sessionToken,
        userRoles: currentState.userRoles
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
            case "setUserRoles":
                nextState.userRoles = update.roles;
                break;
        }
    }

    if (updates instanceof Array) {
        updates.forEach(doUpdate);
    }
    else {
        doUpdate(updates);
    }

    if (nextState.conferenceId !== currentState.conferenceId) {
        LocalStorage_Conference.currentConferenceId = nextState.conferenceId;
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
export default function App() {
    const logger = useLogger("App");
    const history = useHistory();

    const [appState, dispatchAppUpdate] = useReducer(nextAppState, {
        tasks: new Set(["beginLoadConference", "beginLoadCurrentUser"] as Array<AppTasks>),
        conferenceId: LocalStorage_Conference.currentConferenceId,
        conference: null,
        profile: null,
        sessionToken: null,
        userRoles: { isAdmin: false, isManager: false }
    });
    const [chatReady, setChatReady] = useState(false);
    const [videoReady, setVideoReady] = useState(false);

    // logger.enable();

    const [sidebarOpen, setSidebarOpen] = useState<boolean>(window.location.pathname === "/");

    // TODO: Top-level <Route /> detection of `/conference/:confId` to bypass the conference selector

    useEffect(() => {
        const name = LocalStorage_Conference.wasBannedFromName;
        if (name) {
            addError("You were banned from " + name);
            LocalStorage_Conference.wasBannedFromName = null;
        }
    }, []);

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

                dispatchAppUpdate([
                    { action: "setConference", conference: _conference }
                ]);
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
                    let isAdmin = false;
                    let isManager = false;

                    if (appState.conferenceId) {
                        if (user && user.id) {
                            const cache = await Caches.get(appState.conferenceId);
                            if (!(await cache.Ready)) {
                                LocalStorage_Conference.currentConferenceId = null;
                                addError("Conference not available. Please go back to the home page and select a conference.");
                                dispatchAppUpdate([{
                                    action: "setConference",
                                    conference: null
                                }]);
                            }
                            else {
                                const { admin: _isAdmin, manager: _isManager } = await _Role.isUserInRoles(user.id, appState.conferenceId, ["admin", "manager"]);
                                isAdmin = _isAdmin;
                                isManager = isAdmin || _isManager;

                                const previousManagerOrAdmin = LocalStorage_Conference.wasManagerOrAdmin;
                                const previousUserId = LocalStorage_Conference.previousUserId;

                                await cache.updateUserAuthenticated(
                                    { authed: true, sessionToken: user.getSessionToken() },
                                    previousManagerOrAdmin !== isManager || previousUserId !== user.id
                                );

                                LocalStorage_Conference.wasManagerOrAdmin = isManager;
                                LocalStorage_Conference.previousUserId = user.id;

                                profile = await UserProfile.getByUserId(user.id, appState.conferenceId);
                                if (profile) {
                                    sessionToken = user.getSessionToken();

                                    if (profile.isBanned) {
                                        profile = null;
                                        LocalStorage_Conference.currentConferenceId = null;
                                        if (cache.IsInitialised) {
                                            cache.deleteDatabase(false);
                                        }
                                        addError("You have been banned from the selected conference.");
                                        LocalStorage_Conference.wasBannedFromName = appState.conference?.name ?? "the selected conference";
                                        addError("Conference not available. Please go back to the home page and select a conference.");
                                        dispatchAppUpdate([{
                                            action: "setConference",
                                            conference: null
                                        }]);
                                    }
                                }
                            }
                        }
                    }

                    dispatchAppUpdate([
                        {
                            action: "setUserProfile",
                            data: profile && sessionToken
                                ? { profile, sessionToken }
                                : null
                        },
                        {
                            action: "setUserRoles",
                            roles: { isAdmin, isManager }
                        }
                    ]);
                }).catch(reason => {
                    logger.error("Failed to get current user from Parse.", reason);

                    dispatchAppUpdate([
                        { action: "setUserProfile", data: null },
                        { action: "setUserRoles", roles: { isAdmin: false, isManager: false } }
                    ]);
                });;
            }
        }

        updateUser();
    }, [appState.conference, appState.conferenceId, appState.tasks, logger]);

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

    // Update video
    useEffect(() => {
        async function updateVideo() {
            if (appState.conference && appState.sessionToken && appState.profile) {
                Video.setup(appState.conference, appState.profile, appState.sessionToken)
                    .then(ok => {
                        setVideoReady(ok);
                    })
                    .catch(err => {
                        console.error("Error during video initialisation.", err);
                        setVideoReady(false);
                    });
            }
            else {
                Video.teardown()
                    .then(() => {
                        setVideoReady(false);
                    })
                    .catch(err => {
                        console.error("Error during video teardown.", err);
                        setVideoReady(false);
                    });
            }
        }

        updateVideo();
    }, [appState.conference, appState.profile, appState.sessionToken]);

    // Subscribe to data updates for conference and profile
    const onConferenceUpdated = useCallback(function _onConferenceUpdated(value: DataUpdatedEventDetails<"Conference">) {
        for (const object of value.objects) {
            if (appState.conference && object.id === appState.conference.id) {
                const newConf = object as Conference;
                if (handleParseFileURLWeirdness(appState.conference.headerImage) !== handleParseFileURLWeirdness(newConf.headerImage) ||
                    appState.conference.name !== newConf.name ||
                    appState.conference.shortName !== newConf.shortName ||
                    appState.conference.welcomeText !== newConf.welcomeText) {
                    dispatchAppUpdate({ action: "setConference", conference: newConf });
                }
            }
            else if (appState.conferenceId === object.id) {
                dispatchAppUpdate({ action: "setConference", conference: object as Conference });
            }
        }
    }, [appState.conference, appState.conferenceId]);
    const onUserProfileUpdated = useCallback(async function _onUserProfileUpdated(value: DataUpdatedEventDetails<"UserProfile">) {
        for (const object of value.objects) {
            if (appState.sessionToken && appState.profile && object.id === appState.profile.id) {
                const profile = object as UserProfile;
                if (profile.isBanned) {
                    LocalStorage_Conference.currentConferenceId = null;
                    const cache = await Caches.get(profile.conferenceId);
                    if (cache.IsInitialised) {
                        cache.deleteDatabase(false);
                    }
                    addError("You have been banned from the selected conference.");
                    LocalStorage_Conference.wasBannedFromName = appState.conference?.name ?? "the selected conference";
                    window.location.replace("/");
                    window.location.reload();
                }
                else {
                    dispatchAppUpdate([
                        {
                            action: "setUserProfile",
                            data: {
                                profile: object as UserProfile,
                                sessionToken: appState.sessionToken
                            }
                        }
                    ]);
                }
            }
        }
    }, [appState.conference, appState.profile, appState.sessionToken]);

    useDataSubscription(
        "Conference",
        onConferenceUpdated,
        null,
        appState.tasks.has("beginLoadConference") || appState.tasks.has("loadingConference"),
        appState.conference);

    useDataSubscription(
        "UserProfile",
        onUserProfileUpdated,
        null,
        appState.tasks.has("beginLoadCurrentUser") || appState.tasks.has("loadingCurrentUser"),
        appState.conference);

    const doLogin = useCallback(async function _doLogin(email: string, password: string): Promise<boolean> {
        try {
            assert(appState.conference);

            const parseUser = await _User.logIn(email, password);
            const cache = await Caches.get(appState.conference.id);

            const previousManagerOrAdmin = LocalStorage_Conference.wasManagerOrAdmin;
            const previousUserId = LocalStorage_Conference.previousUserId;

            const { admin: isAdmin, manager: _isManager } = await _Role.isUserInRoles(parseUser.user.id, appState.conference.id, ["admin", "manager"]);
            const isManager = isAdmin || _isManager;

            await cache.updateUserAuthenticated(
                { authed: true, sessionToken: parseUser.sessionToken },
                previousManagerOrAdmin !== isManager || previousUserId !== parseUser.user.id
            );

            LocalStorage_Conference.wasManagerOrAdmin = isManager;
            LocalStorage_Conference.previousUserId = parseUser.user.id;

            let profile = await UserProfile.getByUserId(parseUser.user.id, appState.conference.id);

            if (profile?.isBanned) {
                profile = null;
                LocalStorage_Conference.currentConferenceId = null;
                if (cache.IsInitialised) {
                    cache.deleteDatabase(false);
                }
                addError("You have been banned from the selected conference.");
                LocalStorage_Conference.wasBannedFromName = appState.conference.name;
                window.location.replace("/");
                window.location.reload();
            }

            dispatchAppUpdate([
                {
                    action: "setUserProfile",
                    data: profile
                        ? { profile, sessionToken: parseUser.sessionToken }
                        : null
                },
                {
                    action: "setUserRoles",
                    roles: { isAdmin, isManager }
                }
            ]);

            return !!profile;
        }
        catch (e) {
            logger.error(e);
            dispatchAppUpdate([
                { action: "setUserProfile", data: null },
                { action: "setUserRoles", roles: { isAdmin: false, isManager: false } }
            ]);
            return false;
        }
    }, [appState.conference, logger]);

    const doLogout = useCallback(async function _doLogout() {
        try {
            if (appState.conference) {
                const cache = await Caches.get(appState.conference.id);
                cache.updateUserAuthenticated({ authed: false }, false);
            }
        }
        finally {
            dispatchAppUpdate([
                { action: "setConference", conference: null },
                { action: "setUserProfile", data: null },
                { action: "setUserRoles", roles: { isAdmin: false, isManager: false } }
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

        dispatchAppUpdate([
            { action: "setConference", conference }
        ]);

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

        const emojiPickerElement = document.getElementById("emoji-picker");

        // TODO: Wrap this in an error boundary to handle null cache/conference/user and unexpected errors

        const appClassName = appClassNames.reduce((x, y) => `${x} ${y}`);
        // Hint: `user` could be null - see also, `useUser` and `useMaybeUser` hooks
        return <div className={appClassName}>
            <ConferenceContext.Provider value={appState.conference}>
                <UserRolesContext.Provider value={appState.userRoles}>
                    <UserProfileContext.Provider value={appState.profile}>
                        <AppBlocker>
                            <ChatContext.Provider value={chatReady ? Chat.instance() : null}>
                                <VideoContext.Provider value={videoReady ? Video.instance() : null}>
                                    <EmojiContext.Provider value={{ element: emojiPickerElement }}>
                                        {sidebar}
                                        {page}
                                    </EmojiContext.Provider>
                                </VideoContext.Provider>
                            </ChatContext.Provider>
                        </AppBlocker>
                    </UserProfileContext.Provider>
                </UserRolesContext.Provider>
            </ConferenceContext.Provider>
        </div>;
    }
}
