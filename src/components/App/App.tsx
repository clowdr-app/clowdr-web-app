import Parse from "parse";
import React, { useState, useEffect } from 'react';
import './App.scss';
import Page from '../Page/Page';
import LocalStorage_Conference from '../../classes/LocalStorage/Conference';
import Sidebar from '../Sidebar/Sidebar';
import ConferenceContext from '../../contexts/ConferenceContext';
import UserProfileContext from '../../contexts/UserProfileContext';
import DocTitleContext from '../../contexts/DocTitleContext';
import * as DataLayer from "../../classes/DataLayer";
import useLogger from '../../hooks/useLogger';
import { Conference, UserProfile, _User } from "../../classes/DataLayer";
import assert from "assert";
import { useHistory } from "react-router-dom";
import { DocTitleState } from "../../contexts/DocTitleContext";

interface Props {
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

    // Hint: Do not use `LocalStorage_*` interfaces anywhere else - rely on contexts.
    const currentConferenceId = LocalStorage_Conference.currentConferenceId;

    // Get all relevant state information for this component
    // Note: These can't be used inside `useEffect` or other asynchronous
    //       functions.
    const [conference, setConference] = useState<{
        conf: DataLayer.Conference | null,
        loading: boolean
    }>({ conf: null, loading: true });
    const [userProfile, setUserProfile] = useState<{
        profile: DataLayer.UserProfile | null,
        loading: boolean
    }>({ profile: null, loading: true });
    const logger = useLogger("App");
    const history = useHistory();
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [loadingSpinnerCount, setLoadingSpinnerCount] = useState<number>(1);
    const [loadingSpinnerTimeoutId, setLoadingSpinnerTimeoutId] = useState<number | undefined>();

    const [docTitle, setDocTitle] = useState("");
    const docTitleCtx: DocTitleState = {
        get: () => docTitle,
        set: async (val) => {
            setDocTitle(val);
        }
    };
    document.title = docTitle;

    // logger.enable();

    // Update conference
    useEffect(() => {
        /**
         * Maintains the stored conference object in state and the conference id
         * in the session.
         */
        async function updateConference() {
            // Has a conference has been selected?
            if (currentConferenceId) {
                // Have we already loaded the right conference from the cache?
                if (!conference.conf || conference.conf.id !== currentConferenceId) {
                    // Now we can try to fetch the selected conference from the cache
                    // If the cache misses, it will go to the db for us.
                    let _conference = await DataLayer.Conference.get(currentConferenceId);
                    setConference({ conf: _conference, loading: false });

                    // Did the conference actually exist?
                    if (!_conference) {
                        // No? Darn...mustv'e been a fake id. Clear out the state.
                        LocalStorage_Conference.currentConferenceId = null;
                    }
                }
                else if (conference.loading) {
                    setConference({ conf: conference.conf, loading: false });
                }
            }
            else if (conference.conf || conference.loading) {
                // No conference selected - let's make sure our state reflects
                // that fact.
                if (conference) {
                    setConference({ conf: null, loading: false });
                }
            }
        }

        // Apply the update functions asynchronously - no waiting around
        updateConference();
    }, [
        currentConferenceId,
        conference
    ]);

    // Update user profile
    useEffect(() => {
        /**
         * Maintains the stored user object in state and the user id in the
         * session.
         */
        async function updateUser() {
            Parse.User.currentAsync().then(async user => {
                // It turns out the `user.id` can come back `undefined` when the
                // Parse API thinks you're logged in but the user has been
                // deleted in the database.
                if (user && user.id) {
                    if (!userProfile.profile || (await userProfile.profile.user).id !== user.id) {
                        // Has a conference been selected?
                        if (currentConferenceId) {
                            // Yes, good, let's store the user for later.
                            // This will also trigger a re-rendering.
                            let profile = await DataLayer.UserProfile.getByUserId(user.id, currentConferenceId);
                            setUserProfile({ profile: profile, loading: false });
                        }
                        else {
                            // No conference selected, better make sure our internal
                            // state matches that fact.
                            setUserProfile({ profile: null, loading: false });

                            // Note: We don't actually log the user out here, we
                            // just create a consistent state such that our app only
                            // sees the logged in state when there is a conference
                            // selected.
                        }
                    }
                    else if (userProfile.loading) {
                        setUserProfile({ profile: userProfile.profile, loading: false });
                    }
                }
                else if (userProfile.profile || userProfile.loading) {
                    setUserProfile({ profile: null, loading: false });
                }
            }).catch(reason => {
                logger.error("Failed to get current user from Parse.", reason);

                if (userProfile.profile || userProfile.loading) {
                    setUserProfile({ profile: null, loading: false });
                }
            });;
        }

        // Apply the update functions asynchronously
        updateUser();
    }, [
        currentConferenceId,
        logger,
        userProfile
    ]);

    // Update loading spinner
    useEffect(() => {
        if (conference.loading || userProfile.loading) {
            if (!loadingSpinnerTimeoutId) {
                setLoadingSpinnerTimeoutId(window.setTimeout(() => {
                    setLoadingSpinnerCount(loadingSpinnerCount < 3 ? loadingSpinnerCount + 1 : 0);
                    setLoadingSpinnerTimeoutId(undefined);
                }, 1000));
            }
        }
        else if (loadingSpinnerTimeoutId) {
            setLoadingSpinnerCount(1);
            clearTimeout(loadingSpinnerTimeoutId);
        }
    }, [loadingSpinnerCount, conference, userProfile, loadingSpinnerTimeoutId]);

    async function doLogin(email: string, password: string): Promise<boolean> {
        try {
            assert(conference.conf);

            let parseUser = await _User.logIn(email, password);
            let profile = await UserProfile.getByUserId(parseUser.id, conference.conf.id);
            setUserProfile({ profile: profile, loading: false });
            return !!profile;
        }
        catch {
            setUserProfile({ profile: null, loading: false });
            return false;
        }
    }

    async function doLogout() {
        try {
            await Parse.User.logOut();
        }
        finally {
            LocalStorage_Conference.currentConferenceId = null;
            setConference({ conf: null, loading: false });
            setUserProfile({ profile: null, loading: false });
        }
    }

    async function failedToLoadConferences(reason: any): Promise<void> {
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
    }

    async function selectConference(id: string | null): Promise<boolean> {
        let clearSelected = false;
        let ok = true;
        try {
            if (id) {
                const _conference = await Conference.get(id);
                if (_conference) {
                    LocalStorage_Conference.currentConferenceId = id;
                    setConference(conference);
                    setConference({ conf: _conference, loading: false });
                }
                else {
                    ok = false;
                    LocalStorage_Conference.currentConferenceId = null;
                    if (conference.conf) {
                        setConference({ conf: _conference, loading: false });
                    }
                }
            }
            else {
                clearSelected = true;
            }
        }
        catch {
            clearSelected = true;
            ok = false;
        }

        if (clearSelected) {
            LocalStorage_Conference.currentConferenceId = null;
            setConference({ conf: null, loading: false });
        }

        return ok;
    }

    async function toggleSidebar(): Promise<void> {
        setSidebarOpen(!sidebarOpen);
    }

    const appClassNames = ["app"];

    if (conference.loading || userProfile.loading) {
        appClassNames.push("loading");

        const appClassName = appClassNames.reduce((x, y) => `${x} ${y}`);
        return <div className={appClassName}>
            <span>Loading{".".repeat(loadingSpinnerCount)}</span>
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
        if (conference.conf) {
            sidebar = <Sidebar open={sidebarOpen} toggleSidebar={toggleSidebar} doLogout={doLogout} />;
            appClassNames.push(sidebarOpen ? "sidebar-open" : "sidebar-closed");
        }


        // TODO: Wrap this in an error boundary to handle null cache/conference/user

        const appClassName = appClassNames.reduce((x, y) => `${x} ${y}`);
        // Hint: `user` could be null - see also, `useUser` and `useMaybeUser` hooks
        return <div className={appClassName}>
            <ConferenceContext.Provider value={conference.conf}>
                <UserProfileContext.Provider value={userProfile.profile}>
                    <DocTitleContext.Provider value={docTitleCtx}>
                        {sidebar}
                        {page}
                    </DocTitleContext.Provider>
                </UserProfileContext.Provider>
            </ConferenceContext.Provider>
        </div>;
    }
}
