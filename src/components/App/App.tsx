import Parse from "parse";
import React, { useState, useEffect } from 'react';
import './App.scss';
import Page from '../Page/Page';
import Session_Conference from '../../classes/Session/Conference';
import Sidebar from '../Sidebar/Sidebar';
import ConferenceContext from '../../contexts/ConferenceContext';
import UserProfileContext from '../../contexts/UserProfileContext';
import * as DataLayer from "../../classes/DataLayer";
import useLogger from '../../hooks/useLogger';
import { Conference, UserProfile, _User } from "../../classes/DataLayer";
import assert from "assert";

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

    // Hint: Do not use `Session_*` interfaces anywhere else - rely on contexts.
    const currentConferenceId = Session_Conference.currentConferenceId;

    // Get all relevant state information for this component
    // Note: These can't be used inside `useEffect` or other asynchronous
    //       functions.
    const [conference, setConference] = useState<DataLayer.Conference | null>(null);
    const [userProfile, setUserProfile] = useState<DataLayer.UserProfile | null>(null);
    const logger = useLogger("App");

    // State updates go inside a `useEffect`
    useEffect(() => {
        /**
         * Maintains the stored conference object in state and the conference id
         * in the session.
         */
        async function updateConference() {
            // Has a conference has been selected?
            if (currentConferenceId) {
                // Have we already loaded the right conference from the cache?
                if (!conference || conference.id !== currentConferenceId) {
                    // Now we can try to fetch the selected conference from the cache
                    // If the cache misses, it will go to the db for us.
                    let _conference = await DataLayer.Conference.get(currentConferenceId);
                    // Did the conference actually exist?
                    if (!_conference) {
                        // No? Darn...mustv'e been a fake id. Clear out the state.
                        Session_Conference.currentConferenceId = null;
                    }
                    else {
                        // Yes! Great, store the result in the state.
                        // This will also trigger a re-render.
                        setConference(_conference);
                    }
                }
            }
            else {
                // No conference selected - let's make sure our state reflects
                // that fact.
                if (conference) {
                    setConference(null);
                }
            }
        }

        // Apply the update functions asynchronously - no waiting around
        updateConference();
    }, [
        currentConferenceId,
        conference
    ]);

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
                    if (!userProfile || (await userProfile.user).id !== user.id) {
                        // Has a conference been selected?
                        if (currentConferenceId) {
                            // Yes, good, let's store the user for later.
                            // This will also trigger a re-rendering.
                            let profile = await DataLayer.UserProfile.getByUserId(user.id, currentConferenceId);
                            setUserProfile(profile);
                        }
                        else {
                            // No conference selected, better make sure our internal
                            // state matches that fact.
                            setUserProfile(null);

                            // Note: We don't actually log the user out here, we
                            // just create a consistent state such that our app only
                            // sees the logged in state when there is a conference
                            // selected.
                        }
                    }
                }
                else {
                    if (userProfile) {
                        setUserProfile(null);
                    }
                }
            }).catch(reason => {
                logger.error("Failed to get current user from Parse.", reason);
            });;
        }

        // Apply the update functions asynchronously
        updateUser();
    }, [
        currentConferenceId,
        logger,
        userProfile
    ]);

    async function doLogin(email: string, password: string): Promise<boolean> {
        try {
            assert(conference);

            let parseUser = await _User.logIn(email, password);
            let profile = await UserProfile.getByUserId(parseUser.id, conference.id);
            setUserProfile(profile);
            return !!profile;
        }
        catch {
            setUserProfile(null);
            return false;
        }
    }

    async function selectConference(id: string): Promise<void> {
        const conference = await Conference.get(id);
        Session_Conference.currentConferenceId = id;
        setConference(conference);
    }

    // The main page element - this is where the bulk of content goes
    let page = <Page doLogin={doLogin} selectConference={selectConference} />;
    // The sidebar element - only rendered if a conference is selected (user may
    // still be logged out though).
    let sidebar = <></>;

    // Only render the sidebar if we are in a conference This allows
    //  not-logged-in access to some conference elements (e.g.a public program
    //  or welcome page) but reduces our work as we don't have to design an
    //  'empty' sidebar for when no conference is selected.
    if (conference) {
        sidebar = <Sidebar />;
    }

    // TODO: Wrap this in an error boundary to handle null cache/conference/user

    // Hint: `user` could be null - see also, `useUser` and `useMaybeUser` hooks
    return <div className="app">
        <ConferenceContext.Provider value={conference}>
            <UserProfileContext.Provider value={userProfile}>
                {page}
                {sidebar}
            </UserProfileContext.Provider>
        </ConferenceContext.Provider>
    </div>;
}
