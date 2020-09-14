import React from 'react';
import './Page.scss';
import useMaybeConference from '../../hooks/useMaybeConference';
import ConferenceSelection, { failedToLoadConferencesF, selectConferenceF } from '../Pages/ConferenceSelection/ConferenceSelection';
import Login, { doLoginF } from '../Pages/Login/Login';
import useMaybeUserProfile from '../../hooks/useMaybeUserProfile';
import LoggedInWelcome from '../Pages/LoggedInWelcome/LoggedInWelcome';
import useDocTitle from '../../hooks/useDocTitle';
import { Switch, Route } from 'react-router-dom';
import ChatView from '../Pages/ChatView/ChatView';
import BreakoutRoom from '../Pages/BreakoutRoom/BreakoutRoom';

interface Props {
    doLogin: doLoginF;
    failedToLoadConferences: failedToLoadConferencesF;
    selectConference: selectConferenceF;
}

function Page(props: Props) {
    const mConf = useMaybeConference();
    const mUser = useMaybeUserProfile();
    const docTitle = useDocTitle();

    let contentsElem: JSX.Element;
    let actionButtonsWrapper: JSX.Element | null = null;
    let noHeading = false;

    if (mConf && mUser) {
        contentsElem = <Switch>
            <Route exact path="/">
                <LoggedInWelcome />
            </Route>
            <Route path="/chat">
                <ChatView />
            </Route>
            <Route path="/breakout">
                <BreakoutRoom />
            </Route>
        </Switch>;
    }
    else if (mConf) {
        contentsElem = <Login doLogin={props.doLogin} />;
    }
    else {
        noHeading = true;
        contentsElem = <ConferenceSelection
            failedToLoadConferences={props.failedToLoadConferences}
            selectConference={props.selectConference}
        />;
    }

    return <>
        {noHeading ? <></> : <header className={"page-header" + (actionButtonsWrapper ? " actions" : " no-actions")}>
            <h1 id="page-title" className="banner" aria-level={1}>{docTitle.get()}</h1>
            {actionButtonsWrapper}
        </header>}
        <main className="page">
            {contentsElem}
        </main>
    </>;
}

export default Page;
