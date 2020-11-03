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
import { default as AdminRegistration } from '../Pages/Admin/Registration/Registration';
import { default as AdminSidebar } from '../Pages/Admin/Sidebar/Sidebar';
import { default as AdminWelcomePage } from '../Pages/Admin/WelcomePage/WelcomePage';
import { default as AdminTools } from '../Pages/Admin/Tools';
import ComingSoon from '../Pages/ComingSoon/ComingSoon';
import ForgotPassword from '../Pages/Login/ForgotPassword/ForgotPassword';
import ResetPassword from '../Pages/Login/ResetPassword/ResetPassword';
import Exhibits from '../Pages/Exhibits/Exhibits';
import WatchedItems from "../Pages/WatchedItems/WatchedItems";
import About from '../Pages/About/About';
import Legal from '../Pages/Legal/Legal';
import Help from '../Pages/Help/Help';
import Moderation from '../Pages/Moderation/Moderation';
import ModerationHub from '../Pages/ModerationHub/ModerationHub';
import ModerationChat from '../Pages/ChatView/ModerationChat';
import AllAttendees from '../Pages/AllAttendees/AllAttendees';
import useUserRoles from '../../hooks/useUserRoles';
import AdminProgramUpload from '../Pages/Admin/Program/ProgramUpload';

interface Props {
    doLogin: doLoginF;
    failedToLoadConferences: failedToLoadConferencesF;
    selectConference: selectConferenceF;
}

function Page(props: Props) {
    const mConf = useMaybeConference();
    const mUser = useMaybeUserProfile();
    const { isAdmin, isManager } = useUserRoles();

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
    }, setShowSignUp, [mConf?.id], "Page:getConferenceConfiguration:SignUpEnabled");

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

        const resetPasswordRoute = <Route path="/resetPassword/:token/:email" component={(p: RouteComponentProps<any>) =>
            <ResetPassword email={p.match.params.email} token={p.match.params.token} />
        } />;

        // Note: If you try to fix the local development "error" about "all
        // children must have a key" caused by the array of routes below and
        // React being stupid, know that the entire app will become rendered as
        // a single double-quote character ("). No warnings or errors during
        // build or runtime, just a single double quote character to mess with
        // your mind.
        const footerRoutes = [
            <Route path="/about" component={About} />,
            <Route path="/legal" component={Legal} />,
            <Route path="/help" component={Help} />
        ];

        if (mConf && mUser) {
            // TODO: Route for /program/new (conference manager and admin roles only)

            return {
                noHeading: false,
                contents: <Switch>
                    <Route path="/program/new" component={ComingSoon} />

                    <Route path="/moderation/hub" component={(isAdmin || isManager) ? ModerationHub : NotFound} />
                    <Route path="/moderation/:chatId" component={(p: RouteComponentProps<any>) =>
                        <ModerationChat chatId={p.match.params.chatId} />
                    } />
                    <Route path="/moderation" component={Moderation} />

                    <Route exact path="/" component={LoggedInWelcome} />
                    <Route path="/signup" component={() =>
                        <Redirect to="/" />
                    } />

                    <Route path="/watched" component={WatchedItems} />
                    <Route path="/exhibits" component={Exhibits} />
                    <Route path="/attendees" component={AllAttendees} />

                    <Route path="/chat/new/:userProfileId" component={(p: RouteComponentProps<any>) =>
                        <NewChat dmUserProfileId={p.match.params.userProfileId} />
                    } />
                    <Route path="/chat/new" component={() =>
                        <NewChat dmUserProfileId={undefined} />
                    } />
                    <Route path="/chat/:chatId" component={(p: RouteComponentProps<any>) =>
                        <ChatView chatId={p.match.params.chatId} />
                    } />
                    <Route path="/chat" component={AllChats} />


                    <Route path="/room/new" component={() =>
                        <NewVideoRoom />
                    } />
                    <Route path="/room/:roomId" component={(p: RouteComponentProps<any>) =>
                        <VideoRoom roomId={p.match.params.roomId} />
                    } />
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
                        <Profile userProfileId={p.match.params.userProfileId} />
                    } />
                    <Route path="/profile" component={() =>
                        <Redirect to={"/profile/" + mUser.id} />
                    } />

                    <Route path="/admin/registration" component={() =>
                        <AdminRegistration />
                    } />
                    <Route path="/admin/sidebar" component={() =>
                        <AdminSidebar />
                    } />
                    <Route path="/admin/welcome" component={() =>
                        <AdminWelcomePage />
                    } />
                    <Route path="/admin/program/upload" component={() =>
                        <AdminProgramUpload />
                    } />
                    <Route path="/admin" component={() =>
                        <AdminTools />
                    } />

                    {footerRoutes}

                    {resetPasswordRoute}

                    <Route path="/" component={NotFound} />
                </Switch>
            };
        }
        else {
            const registerRoute = <Route path="/register/:conferenceId/:registrationId/:email" component={(p: RouteComponentProps<any>) =>
                <Register conferenceId={p.match.params.conferenceId} registrationId={p.match.params.registrationId} email={p.match.params.email} />
            } />;

            if (mConf) {
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
                        {footerRoutes}
                        {registerRoute}
                        {resetPasswordRoute}
                        <Route path="/forgotPassword/:email?" component={(p: RouteComponentProps<any>) =>
                            <ForgotPassword initialEmail={p.match.params.email} />
                        } />;
                        <Route path="/" component={() => loginComponent} />
                    </Switch>
                };
            } else {
                return {
                    noHeading: true,
                    contents: <Switch>
                        {footerRoutes}
                        {registerRoute}
                        {resetPasswordRoute}
                        <Route path="/" component={() =>
                            <ConferenceSelection
                                failedToLoadConferences={props.failedToLoadConferences}
                                selectConference={props.selectConference} />} />
                    </Switch>
                };
            }
        }
    }, [isAdmin, isManager, mConf, mUser, props, showSignUp]);

    return <div className="page-wrapper">
        {noHeading ? <></> : <header className="page-header">
            <h1 id="page-title" className="banner" aria-level={1}>
                {heading.icon ? heading.icon : <></>}
                {heading.title}
            </h1>
            {heading.subtitle ? <div className="subtitle">{heading.subtitle}</div> : <></>}
            {actionButtonsWrapper}
        </header>}
        <main className="page">
            <HeadingContext.Provider value={setHeading}>
                {contents}
            </HeadingContext.Provider>
        </main>
    </div>;
}

export default Page;
