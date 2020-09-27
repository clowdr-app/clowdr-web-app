import React, { useCallback, useMemo, useState } from 'react';
import './Page.scss';
import useMaybeConference from '../../hooks/useMaybeConference';
import ConferenceSelection, { failedToLoadConferencesF, selectConferenceF } from '../Pages/ConferenceSelection/ConferenceSelection';
import Login, { doLoginF } from '../Pages/Login/Login';
import useMaybeUserProfile from '../../hooks/useMaybeUserProfile';
import LoggedInWelcome from '../Pages/LoggedInWelcome/LoggedInWelcome';
import DocTitleContext from '../../contexts/DocTitleContext';
import { Switch, Route, RouteComponentProps, Redirect } from 'react-router-dom';
import ChatView from '../Pages/ChatView/ChatView';
import VideoRoom from '../Pages/VideoRoom/VideoRoom';
import NotFound from '../Pages/NotFound/NotFound';
import AllChats from '../Pages/AllChats/AllChats';
import AllVideoRooms from '../Pages/AllVideoRooms/AllVideoRooms';
import Profile from '../Pages/Profile/Profile';
import SignUp from '../Pages/SignUp/SignUp';
import useSafeAsync from '../../hooks/useSafeAsync';
import { ConferenceConfiguration } from 'clowdr-db-schema/src/classes/DataLayer';
import NewChat from '../Pages/NewChat/NewChat';
import WholeProgram from '../Pages/Program/All/WholeProgram';

interface Props {
    doLogin: doLoginF;
    failedToLoadConferences: failedToLoadConferencesF;
    selectConference: selectConferenceF;
}

function Page(props: Props) {
    const mConf = useMaybeConference();
    const mUser = useMaybeUserProfile();

    const [docTitle, _setDocTitle] = useState("Clowdr");
    document.title = docTitle;
    const setDocTitle = useCallback((v) => {
        _setDocTitle(v);
    }, []);

    const [showSignUp, setShowSignUp] = useState<boolean>(false);

    // TODO: Welcome notification/modal with link to a tour (video?) of how to use Clowdr

    useSafeAsync(async () => {
        if (mConf) {
            const signUpEnabled = await ConferenceConfiguration.getByKey("SignUpEnabled", mConf.id);
            if (signUpEnabled.length > 0) {
                return signUpEnabled[0].value === "true";
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }, setShowSignUp, [mConf?.id]);

    const actionButtonsWrapper: JSX.Element | null = null;

    const { noHeading, contents } = useMemo(() => {
        if (mConf && mUser) {
            // TODO: Route for /room/new (to create a new video room)
            // TODO: Route for /program/new (conference manager and admin roles only)

            // TODO: Route for /watched (to see/edit watched items)
            // TODO: Route for /moderators (to contact the conference mods)
            // TODO: Route for /admin to access the top-level admin interface (admin/manager roles only)

            // TODO: Route for /about
            // TODO: Route for /legal
            // TODO: Route for /help

            // TODO: Route for /track/:trackId (to view a track - this should work out which chat to render)
            // TODO: Route for /session/:programSessionId (to view a session - this should work out which room to render)
            // TODO: Route for /event/:programSessionEventId (to view an event - this should work out which room to render)

            return {
                noHeading: false,
                contents: <Switch>
                    <Route exact path="/" component={LoggedInWelcome} />
                    <Route path="/signup" component={() =>
                        <Redirect to="/" />
                    } />

                    <Route path="/chat/new/:userProfileId" component={(p: RouteComponentProps<any>) =>
                        <NewChat dmUserProfileId={p.match.params.userProfileId} />
                    } />
                    <Route path="/chat/new" component={() =>
                        <NewChat dmUserProfileId={undefined} />
                    } />
                    <Route path="/chat/:chatId" component={(p: RouteComponentProps<any>) =>
                        <ChatView chatId={p.match.params.chatId} />}
                    />
                    <Route path="/chat" component={AllChats} />


                    <Route path="/room/:roomId" component={(p: RouteComponentProps<any>) =>
                        <VideoRoom roomId={p.match.params.roomId} />}
                    />
                    <Route path="/room" component={AllVideoRooms} />


                    <Route path="/program" component={(p: RouteComponentProps<any>) =>
                        <WholeProgram />
                    } />


                    <Route path="/profile/:userProfileId" component={(p: RouteComponentProps<any>) =>
                        <Profile userProfileId={p.match.params.userProfileId} />}
                    />
                    <Route path="/profile" component={() =>
                        <Redirect to={"/profile/" + mUser.id} />
                    } />
                    <Route path="/" component={NotFound} />
                </Switch>
            };
        }
        else if (mConf) {
            const loginComponent = <Login
                showSignUp={showSignUp}
                doLogin={props.doLogin}
                clearSelectedConference={async () => {
                    props.selectConference(null)
                }}
            />;
            const signUpComponent
                = showSignUp
                    ? <SignUp clearSelectedConference={async () => {
                        props.selectConference(null)
                    }} />
                    : <Redirect to="/" />;

            return {
                noHeading: true,
                contents: <Switch>
                    <Route path="/signup" component={() => signUpComponent} />
                    <Route path="/" component={() => loginComponent} />
                </Switch>
            };
        }
        else {
            return {
                noHeading: true,
                contents: <ConferenceSelection
                    failedToLoadConferences={props.failedToLoadConferences}
                    selectConference={props.selectConference}
                />
            };
        }
    }, [mConf, mUser, props, showSignUp]);

    return <>
        {noHeading ? <></> : <header className={"page-header" + (actionButtonsWrapper ? " actions" : " no-actions")}>
            <h1 id="page-title" className="banner" aria-level={1}>{docTitle}</h1>
            {actionButtonsWrapper}
        </header>}
        <main className="page">
            <DocTitleContext.Provider value={setDocTitle}>
                {contents}
            </DocTitleContext.Provider>
        </main>
    </>;
}

export default Page;
