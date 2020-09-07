import React, { useState, useEffect } from 'react';
import './App.scss';
import Page from '../Page/Page';
import Session from '../../classes/Session/Conference';
import Sidebar from '../Sidebar/Sidebar';
import ConferenceContext from '../../contexts/ConferenceContext';
import Cache from '../../classes/Cache';
import { Conference } from '../../classes/Data';

interface IAppProps {
}

interface IAppState {
}

type Props = IAppProps;

function App(props: Props) {

    const currentConferenceId = Session.currentConferenceId;
    const [cache, setCache] = useState<Cache | null>(currentConferenceId ? new Cache(currentConferenceId) : null);
    const [conference, setConference] = useState<Conference | null>(null);

    useEffect(() => {
        async function updateConference() {
            if (currentConferenceId) {
                if (!conference || conference.id !== currentConferenceId) {
                    let _cache;
                    if (!cache) {
                        _cache = new Cache(currentConferenceId);
                        setCache(_cache);
                    }
                    else {
                        _cache = cache;
                    }

                    let _conference = await _cache.get<"ClowdrInstance", Conference>("ClowdrInstance", currentConferenceId);
                    if (!_conference) {
                        setCache(null);
                    }
                    else {
                        setConference(_conference || null);
                    }
                }
            }
            else {
                if (cache) {
                    setCache(null);
                }
                if (conference) {
                    setConference(null);
                }
            }
        }

        updateConference();
    });

    let page = <Page />;
    let sidebar = <></>;

    if (conference) {
        sidebar = <ConferenceContext.Provider value={conference}>
            <Sidebar />
        </ConferenceContext.Provider>;
    }

    return <div className="app">
        {page}
        {sidebar}
    </div>;
}

export default App;
