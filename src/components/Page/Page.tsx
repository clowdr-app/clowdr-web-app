import React, { useCallback, useMemo, useState } from 'react';
import './Page.scss';
import useMaybeConference from '../../hooks/useMaybeConference';
import ConferenceSelection, { failedToLoadConferencesF, selectConferenceF } from '../Pages/ConferenceSelection/ConferenceSelection';
import Login, { doLoginF } from '../Pages/Login/Login';
import useMaybeUserProfile from '../../hooks/useMaybeUserProfile';
import LoggedInWelcome from '../Pages/LoggedInWelcome/LoggedInWelcome';
import HeadingContext, { ActionButton } from '../../contexts/HeadingContext';
import { Switch, Route, RouteComponentProps, Redirect, Link } from 'react-router-dom';
import ChatView from '../Pages/ChatView/ChatView';
import VideoRoom from '../Pages/VideoRoom/VideoRoom';
import NotFound from '../Pages/NotFound/NotFound';
import AllChats from '../Pages/AllChats/AllChats';
import AllVideoRooms from '../Pages/AllVideoRooms/AllVideoRooms';
import Profile from '../Pages/Profile/Profile';
import SignUp from '../Pages/SignUp/SignUp';
import useSafeAsync from '../../hooks/useSafeAsync';
import { ConferenceConfiguration } from '@clowdr-app/clowdr-db-schema/build/DataLayer';
import NewChat from '../Pages/NewChat/NewChat';
import WholeProgram from '../Pages/Program/All/WholeProgram';
import ViewTrack from '../Pages/Program/Track/ViewTrack';
import ViewSession from '../Pages/Program/Session/ViewSession';
import ViewEvent from '../Pages/Program/Event/ViewEvent';
import { HeadingState } from '../../contexts/HeadingContext';
import ViewAuthor from '../Pages/Program/Author/ViewAuthor';
import ViewItem from '../Pages/Program/Item/ViewItem';
import NewVideoRoom from '../Pages/NewVideoRoom/NewVideoRoom';
import Register from '../Pages/Register/Register';

interface Props {
    doLogin: doLoginF;
    failedToLoadConferences: failedToLoadConferencesF;
    selectConference: selectConferenceF;
}

function Page(props: Props) {
    const mConf = useMaybeConference();
    const mUser = useMaybeUserProfile();

    const [heading, _setHeading] = useState<HeadingState>({ title: "Clowdr" });
    document.title = heading.title;
    const setHeading = useCallback((v) => {
        _setHeading(v);
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

    function renderActionButton(button: ActionButton): JSX.Element {
        if (typeof button.action === "string") {
            return <Link to={button.action} className="button">{button.icon}{button.label}</Link>;
        }
        else {
            return <button onClick={button.action} className="button">{button.icon}{button.label}</button>;
        }
    }

    let actionButtonsWrapper: JSX.Element = <></>;
    if (heading.buttons) {
        actionButtonsWrapper =
            <div className="actions">
                {heading.buttons.reduce((acc, b) => <>{acc}{renderActionButton(b)}</>, <></>)}
            </div>;
    }

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

            // TODO: Route for /exhibits (to view exhibited program items - e.g. posters)

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


                    <Route path="/room/new" component={() =>
                        <NewVideoRoom />
                    } />
                    <Route path="/room/:roomId" component={(p: RouteComponentProps<any>) =>
                        <VideoRoom roomId={p.match.params.roomId} />}
                    />
                    <Route path="/room" component={AllVideoRooms} />


                    <Route path="/track/:trackId" component={(p: RouteComponentProps<any>) =>
                        <ViewTrack trackId={p.match.params.trackId} />
                    } />
                    <Route path="/session/:sessionId" component={(p: RouteComponentProps<any>) =>
                        <ViewSession sessionId={p.match.params.sessionId} />
                    } />
                    <Route path="/event/:eventId" component={(p: RouteComponentProps<any>) =>
                        <ViewEvent eventId={p.match.params.eventId} />
                    } />
                    <Route path="/item/:itemId" component={(p: RouteComponentProps<any>) =>
                        <ViewItem item={p.match.params.itemId} />
                    } />
                    <Route path="/author/:authorId" component={(p: RouteComponentProps<any>) =>
                        <ViewAuthor authorId={p.match.params.authorId} />
                    } />
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
                    <Route path="/register/:token/:greeting" component={(p: RouteComponentProps<any>) =>
                        <Register token={p.match.params.token} greeting={p.match.params.greeting} />
                    } />
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
        {noHeading ? <></> : <header className="page-header">
            <h1 id="page-title" className="banner" aria-level={1}>{heading.title}</h1>
            {heading.subtitle ? <div className="subtitle">{heading.subtitle}</div> : <></>}
            {actionButtonsWrapper}
        </header>}
        <main className="page">
            <HeadingContext.Provider value={setHeading}>
                {contents}
            </HeadingContext.Provider>
        </main>
    </>;
}

export default Page;
