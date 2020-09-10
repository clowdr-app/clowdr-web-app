import React, { useState, useEffect } from 'react';
import './App.scss';
import Page from '../Page/Page';
import Session_Conference from '../../classes/Session/Conference';
import Session_User from '../../classes/Session/User';
import Sidebar from '../Sidebar/Sidebar';
import ConferenceContext from '../../contexts/ConferenceContext';
import UserContext from '../../contexts/UserContext';
import { User } from '../../classes/Data';
import * as DataLayer from "../../classes/DataLayer";

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

    useEffect(() => {
        DataLayer.AttachmentType.getAll("ciAZ1zroPD").then(async result => {
            let results = await Promise.all(result.map(async x => ({
                name: x.name,
                conferenceName: (await x.conference).conferenceName
            })));
            console.log("Got attachment types", results);
        });
        DataLayer.Conference.getAll().then(async result => {
            console.log("Got conferences", result.map(r => r.conferenceName));
        });
        DataLayer.ProgramItem.get("6ZSU9G1Iwl", "ciAZ1zroPD").then(async result => {
            if (result) {
                console.log("Got program item", {
                    title: result.title,
                    track: await result.track
                });
            }
        });
        DataLayer.Conference.get("ciAZ1zroPD").then(
            async result => {
                console.log("Got conference", result?.conferenceName);

                // if (result) {
                //     let parseConf = await result.getUncachedParseObject();
                //     let newAT = new Parse.Object("AttachmentType") as Parse.Object<PromisesRemapped<Schema.AttachmentType>>;
                //     newAT.set("conference", parseConf);
                //     newAT.set("displayAsLink", true);
                //     newAT.set("isCoverImage", false);
                //     newAT.set("name", "Test AttachmentType In DB");
                //     newAT.set("ordinal", 0);
                //     newAT.set("supportsFile", false);
                //     newAT.save();
                // }
            });
    });

    // Hint: Do not use `Session_*` interfaces anywhere else - rely on contexts.
    const currentConferenceId = Session_Conference.currentConferenceId;
    const currentUserId = Session_User.currentUserId;

    // Get all relevant state information for this component
    // Note: These can't be used inside `useEffect` or other asynchronous
    //       functions.
    const [conference, setConference] = useState<DataLayer.Conference | null>(null);
    const [user, setUser] = useState<User | null>(null);
    // TODO: Handle the User Profile

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

        /**
         * Maintains the stored user object in state and the user id in the
         * session.
         */
        async function updateUser() {
            // Has a conference been selected and a cache created?
            if (currentConferenceId) {
                // Have we already loaded the correct user?
                if (currentUserId && currentUserId !== user?.id) {
                    // No, so let's go to the cache for it. The cache will hit
                    // the db for us if the user isn't already present.
                    //   TODO: Lookup against the User class
                    // let _user = await DataLayer.User.get(currentUserId, currentConferenceId);
                    // // Did a user with that id actually exist?
                    // if (_user) {
                    //     // Yes, good, let's store the user for later.
                    //     // This will also trigger a re-rendering.
                    //     setUser(_user);
                    // }
                    // else {
                    //     // No, darn, must've been a fake id.
                    Session_User.currentUserId = null;
                    setUser(null);
                    // }
                }
            }
            else {
                // No conference selected, better make sure our internal state
                // matches that fact.
                if (user) {
                    Session_User.currentUserId = null;
                    setUser(null);
                }
            }
        }

        // Apply the various update functions asynchronously - no waiting around
        updateConference();
        updateUser();
    });

    // The main page element - this is where the bulk of content goes
    let page = <Page />;
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
            <UserContext.Provider value={user}>
                {page}
                {sidebar}
            </UserContext.Provider>
        </ConferenceContext.Provider>
    </div>;
}
