import React, {Component} from 'react';
import {BrowserRouter, NavLink, Route} from 'react-router-dom';
import BrowserDetection from 'react-browser-detection';
import { message } from 'antd';


import Home from "./components/Home"
import Lobby from "./components/Lobby"
import SignUp from "./components/SignUp"
import SignIn from "./components/SignIn"
import AccountFromToken from "./components/Account/AccountFromToken"
import {Button, Layout, Select, Spin, Tooltip, Typography} from 'antd';
import './App.css';
import LinkMenu from "./components/linkMenu";
import SignOut from "./components/SignOut";
import Moderation from "./components/Moderation";

import {Program} from "./components/Program";
import VideoRoom from "./components/VideoChat/VideoRoom"
import SlackToVideo from "./components/Slack/slackToVideo"

import {withAuthentication} from "./components/Session";
import {withProgram} from "./components/Program"

import LiveVideosArea from "./components/LiveStreaming";
import Exhibits from "./components/Exhibits";

import Parse from "parse";
import ForgotPassword from "./components/Account/ForgotPassword";

import Account from "./components/Account";
import VideoChat from "./components/VideoChat";
// import ScheduleList from "./components/Admin/Schedule";
// import UsersList from "./components/Admin/Users";
//
import Registrations from "./components/Admin/Registrations";
import Configuration from "./components/Admin/Config";
import ProgramSummary from "./components/Admin/Program/ProgramSummary";
import Rooms from "./components/Admin/Program/Rooms";
import Tracks from "./components/Admin/Program/Tracks";
import ProgramItems from "./components/Admin/Program/Items";
import ProgramSessions from "./components/Admin/Program/Sessions";
// import EditUser from "./components/Admin/Users/EditUser";
// import ChannelList from "./components/ChannelList";
//import Chat from "./components/Chat";
import GenericHeader from "./components/GenericHeader";
import GenericLanding from "./components/GenericLanding";
import SocialTab from "./components/SocialTab";
import About from "./components/About";
import Help from "./components/Help";
import SidebarChat from "./components/SocialTab/SidebarChat";
import {withRouter} from "react-router";
import BottomChat from "./components/SocialTab/BottomChat";
import ProgramItem from "./components/ProgramItem";


Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

const {Header, Content, Footer, Sider} = Layout;
class App extends Component {

    constructor(props) {
        super(props);
        // this.state ={'activeKey'=routing}

        // if(this.props.match.)
        this.state = {
            conference: null,
            showingLanding: this.props.authContext.showingLanding,
            socialCollapsed: false,
            chatCollapsed: false
        }

        if(window.location.pathname.startsWith("/fromSlack") &&!this.props.authContext.user){
            this.state.isMagicLogin = true;
        }
    }

    isSlackAuthOnly() {
        if(!this.state.conference)
            return true;
        return !this.state.conference.get("isIncludeAllFeatures");
    }

    siteHeader() {
        if (!this.state.conference){
            return <GenericHeader/>
        } else {
            let headerImage = this.state.conference.get("headerImage");
            let headerText = this.state.conference.get("headerText");
            let confSwitcher;
            let clowdrActionButtons;
            if(this.props.authContext.validConferences && this.props.authContext.validConferences.length > 1 && this.isSlackAuthOnly()){
                confSwitcher = <Select
                                       placeholder="Change conference"
                                       onChange={(conf)=>{
                                           console.log(conf);
                    this.props.authContext.helpers.setActiveConference(this.props.authContext.validConferences[conf]);
                }}>
                    {
                        this.props.authContext.validConferences.map((conf,i)=>
                            <Select.Option key={i}>{conf.get("conferenceName")}</Select.Option>)
                    }
                </Select>
                clowdrActionButtons = <span>
                {(this.props.authContext.user && this.props.authContext.permissions.includes("moderator") ? <NavLink to="/moderation"><Button size="small">Moderation</Button></NavLink> : <></>)}
                    <Tooltip mouseEnterDelay={0.5} title="CLOWDR Support"><NavLink to="/help"><Button size="small">Help</Button></NavLink></Tooltip>
                <Tooltip mouseEnterDelay={0.5} title="About CLOWDR"><NavLink to="/about"><Button size="small">About</Button></NavLink></Tooltip>
                <NavLink to="/signout"><Button size="small">Sign Out</Button></NavLink>
                </span>
            }

            if(confSwitcher){
                confSwitcher = <span style={{float: "right"}}>{confSwitcher} {clowdrActionButtons}</span>
            }
            else
                confSwitcher= <span style={{float: "right"}}>{clowdrActionButtons}</span>;
            if (headerImage)
                return <Header className="site-layout-background" style={{height: "90px", clear: "both"}}>
                    <img src={headerImage.url()} className="App-logo" height="90"
                         alt="logo"/><span style={{paddingLeft: "20px"}}><Typography.Title
                    style={{display: "inherit"}}>{headerText}</Typography.Title>{confSwitcher}</span>
                </Header>
            else if (headerText) {
                return <Header className="site-layout-background" style={{height: "140px", clear: "both"}}>
                    <Typography.Title>{headerText}</Typography.Title>{confSwitcher}
                </Header>
            } else
                return <Header className="site-layout-background" style={{clear:'both' }}>
                   <div style={{float:'left'}}><Typography.Title>
                       {this.state.conference.get('conferenceName')} Group Video Chat</Typography.Title></div>{confSwitcher}</Header>
        }
    }

    navBar() {
        if (this.isSlackAuthOnly()) {
            return <div></div>
        }
        return <Header><LinkMenu/></Header>

    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (!prevProps.authContext || prevProps.authContext.currentConference != this.props.authContext.currentConference) {
            this.refreshConferenceInformation();
        }
        if (this.props.authContext.showingLanding != this.state.showingLanding) {
            this.setState({showingLanding: this.props.authContext.showingLanding});
        }
        if (this.state.isMagicLogin && (!window.location.pathname.startsWith("/fromSlack") || this.props.authContext.user)) {
            this.setState({isMagicLogin: false});
        }
    }

    componentDidMount() {
        if (this.props.authContext.currentConference)
            this.refreshConferenceInformation();
        this.props.authContext.history = this.props.history;

    }

    refreshConferenceInformation() {
        this.setState({conference: this.props.authContext.currentConference});
    }

    routes() {
        let baseRoutes = [
            <Route key="finishAccount" exact path="/finishAccount/:userID/:conferenceID/:token" component={AccountFromToken} />,
            <Route key="forgotPassword" exact path="/resetPassword/:userID/:token" component={ForgotPassword} />

        ];
        if (this.isSlackAuthOnly()) {
            return <div>
                {baseRoutes}
                <Route exact path="/" component={Lobby}/>
                <Route exact path="/fromSlack/:team/:token" component={SlackToVideo}/>
                <Route exact path="/video/:conf/:roomName" component={VideoRoom}/>
                <Route exact path="/signout" component={SignOut}/>
                <Route exact path="/lobby" component={Lobby}/>
                <Route exact path="/signin" component={SignIn}/>
                <Route exact path="/about" component={About}/>
                <Route exact path="/help" component={Help} />
                <Route exact path="/moderation" component={Moderation} />

                <Route exact path="/lobby/new/:roomName" component={Lobby} /> {/* Gross hack just for slack */}

                <Route exact path="/admin" component={(props)=><SignIn {...props} dontBounce={true}/>} />
            </div>

        }
        return (<div>
            {baseRoutes}
            <Route exact path="/" component={Home}/>
            <Route exact path="/program/:programConfKey1/:programConfKey2" component={ProgramItem}/>
            <Route exact path="/live/:when/:roomName?" component={LiveVideosArea}/>

            <Route exact path="/program" component={Program}/>

            <Route exact path="/exhibits/:track/:style" component={Exhibits}/>
            {/* <Route exact path="/exhibits/srcposters" component={SRCPosters}/> */}

            <Route exact path="/fromSlack/:team/:token" component={SlackToVideo}/>
            <Route exact path="/video/:parseRoomID" component={VideoRoom}/>

            <Route exact path="/video/:conf/:roomName" component={VideoRoom}/>
            <Route exact path="/moderation" component={Moderation} />

            <Route exact path="/about" component={About}/>
            <Route exact path="/help" component={Help} />
            {/*<Route exact path="/channelList" component={ChannelList}/>*/}

            <Route exact path="/account" component={Account}/>
            <Route exact path="/videoChat/:roomId" component={VideoChat}/>
            <Route exact path="/lobby" component={Lobby}/>
            <Route exact path="/lobby/new/:roomName" component={Lobby} /> {/* Gross hack just for slack */}
            {/* <Route exact path="/signup" component={SignUp}/> */}
            <Route exact path="/signin" component={SignIn}/>
            <Route exact path="/signout" component={SignOut}/>
            <Route exact path="/admin" component={(props)=><SignIn {...props} dontBounce={true}/>} />

            {/*<Route exact path='/admin/schedule' component={withAuthentication(ScheduleList)} />*/}
            {/*<Route exact path='/admin/users' component={withAuthentication(UsersList)} />*/}
            {/*<Route exact path='/admin/users/edit/:userID' component={withAuthentication(EditUser)} />*/}
            <Route exact path='/admin/configuration' component={Configuration}/>
            <Route exact path='/admin/registrations' component={Registrations}/>
            <Route exact path='/admin/program/rooms' component={Rooms}/>
            <Route exact path='/admin/program/tracks' component={Tracks}/>
            <Route exact path='/admin/program/items' component={ProgramItems}/>
            <Route exact path='/admin/program/sessions' component={ProgramSessions}/>
            <Route exact path='/admin/program/programSummary' component={ProgramSummary}/>
        </div>)
    }

    toggleLobbySider() {
        this.setState({socialCollapsed: !this.state.socialCollapsed});
    }
    toggleChatSider() {
        this.setState({chatCollapsed: !this.state.chatCollapsed});
    }

    setChatWidth(w){
        this.setState({chatWidth: w});
    }
    setLobbyWidth(w){
        this.setState({lobbyWidth: w});
    }
    render() {
        if (this.state.isMagicLogin) {
            return <Route exact path="/fromSlack/:team/:token" component={SlackToVideo}/>
        }
        if(this.state.showingLanding){
            return <GenericLanding />
        }
        if (!this.state.conference) {
            if (this.state.loadingUser) {
                return <div style={{
                    height: "100vh",
                    width: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <Spin/>
                </div>
            }
        }

        let isLoggedIn = this.props.authContext.user != null;
        return (
                <div className="App">
                    <div>
                    <Layout className="site-layout">
                        <div id="top-content">
                            {this.siteHeader()}
                            {this.navBar()}
                        {/*<Header className="action-bar">*/}
                        {/*    /!*<Badge*!/*/}
                        {/*    /!*    title={this.props.authContext.liveVideoRoomMembers + " user"+(this.props.authContext.liveVideoRoomMembers == 1 ? " is" : "s are")+" in video chats"}*!/*/}
                        {/*    /!*    showZero={true} style={{backgroundColor: '#52c41a'}} count={this.props.authContext.liveVideoRoomMembers} offset={[0,-5]}>*!/*/}
                        {/*    <Button style={lobbySiderButtonStyle} onClick={this.toggleLobbySider.bind(this)} size="small" >Breakout Rooms <RightOutlined /></Button>*/}
                        {/*    <Button style={chatSiderButtonStyle} onClick={this.toggleChatSider.bind(this)} size="small" >Chat</Button>*/}

                        {/*    /!*</Badge>*!/*/}
                        {/*    </Header>*/}
                        </div>
                        <div className="main-area">
                            <Layout>
                                {/*<div className="lobbySessionTab" style={{left: (this.state.socialCollapsed?"0px":"250px")}}><Button onClick={this.toggleLobbySider.bind(this)}  size="small">Breakout Rooms {(this.state.socialCollapsed? ">":"x")}</Button> </div>*/}
                                {/*<div className="lobbySessionTab" style={{right: (this.state.chatCollapsed?"0px":"250px")}}><Button onClick={this.toggleChatSider.bind(this)}  size="small">{(this.state.chatCollapsed? "<":"x")} Chat</Button> </div>*/}

                                <SocialTab collapsed={this.state.socialCollapsed} setWidth={this.setLobbyWidth.bind(this)}/>
                                <Content style={{
                                    overflow: 'initial',
                                    paddingRight: this.state.chatWidth,
                                    paddingLeft: this.state.lobbyWidth
                                }}>
                                    <div className="site-layout-background" style={{padding: 24}}>
                                        {this.routes()}
                                    </div>

                                </Content>

                                <SidebarChat collapsed={this.state.chatCollapsed} setWidth={this.setChatWidth.bind(this)}/>
                            </Layout>
                        </div>
                    </Layout>
                    </div>
                    <BottomChat style={{
                        right: this.state.chatWidth,
                        left: this.state.lobbyWidth
                    }}/>
                    {/* <div style={{position:
                    "sticky", bottom: 0}}>
                        <Chat />
                    </div> */}
                </div>
        );
    }
}


let RouteredApp = withRouter(App);
class ClowdrApp extends React.Component{
    okBrowser = ()=><></>;
    browserHandler = {
        chrome: this.okBrowser,
        edge: this.okBrowser,
        safari: this.okBrowser,
        default: (browser) => {
            message.error(<span>The browser that you are using, {browser} is not known to be supported by Clowdr. <br />Clowdr is still in
                beta mode, and we would suggest using Chrome, Safari, or Edge for the best experience.</span>,0)
            return <></>
        }
    };

   render() {
       return <BrowserRouter basename={process.env.PUBLIC_URL}>
           <BrowserDetection>
               {this.browserHandler}
           </BrowserDetection>
               <RouteredApp authContext={this.props.authContext} />
       </BrowserRouter>
   }
}

export default withProgram(withAuthentication(ClowdrApp));
