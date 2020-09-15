import React from 'react';
import './Page.scss';
import useMaybeConference from '../../hooks/useMaybeConference';
import ConferenceSelection, { failedToLoadConferencesF, selectConferenceF } from '../Pages/ConferenceSelection/ConferenceSelection';
import Login, { doLoginF } from '../Pages/Login/Login';
import useMaybeUserProfile from '../../hooks/useMaybeUserProfile';
import LoggedInWelcome from '../Pages/LoggedInWelcome/LoggedInWelcome';
import useDocTitle from '../../hooks/useDocTitle';
import { Switch, Route, RouteComponentProps } from 'react-router-dom';
import ChatView from '../Pages/ChatView/ChatView';
import BreakoutRoom from '../Pages/BreakoutRoom/BreakoutRoom';
import NotFound from '../Pages/NotFound/NotFound';
import AllChats from '../Pages/AllChats/AllChats';
import AllBreakoutRooms from '../Pages/AllBreakoutRooms/AllBreakoutRooms';

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
            <Route exact path="/" component={LoggedInWelcome} />
            <Route path="/chat/:chatId" component={(props: RouteComponentProps<any>) =>
                <ChatView chatId={props.match.params.chatId} />}
            />
            <Route path="/chat" component={AllChats} />
            <Route path="/breakout/:roomId" component={(props: RouteComponentProps<any>) =>
                <BreakoutRoom roomId={props.match.params.roomId} />}
            />
            <Route path="/breakout" component={AllBreakoutRooms} />
            <Route path="/" component={NotFound} />
        </Switch>;
    }
    else if (mConf) {
        contentsElem = <Login
            doLogin={props.doLogin}
            clearSelectedConference={async () => {
                props.selectConference(null)
            }}
        />;
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
