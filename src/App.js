import React, {Component} from 'react';
import {BrowserRouter, NavLink, Route} from 'react-router-dom';

import Home from "./components/Home"
import Lobby from "./components/Lobby"
import SignUp from "./components/SignUp"
import SignIn from "./components/SignIn"
import {RightOutlined} from "@ant-design/icons"
import {Button, Layout, Select, Spin, Tooltip, Typography} from 'antd';
import './App.css';
import LinkMenu from "./components/linkMenu";
import SignOut from "./components/SignOut";
import Program from "./components/Program";
import VideoRoom from "./components/VideoChat/VideoRoom"
import SlackToVideo from "./components/Slack/slackToVideo"

import {withAuthentication} from "./components/Session";

import LiveStreaming from "./components/LiveStreaming";
import Parse from "parse";

import Account from "./components/Account";
import VideoChat from "./components/VideoChat";
// import ScheduleList from "./components/Admin/Schedule";
// import UsersList from "./components/Admin/Users";
//
import LiveVideosList from "./components/Admin/LiveVideos";
import withGeoLocation from './components/GeoLocation/withGeoLocation';
// import EditUser from "./components/Admin/Users/EditUser";
// import ChannelList from "./components/ChannelList";
//import Chat from "./components/Chat";
import GenericHeader from "./components/GenericHeader";
import GenericLanding from "./components/GenericLanding";
import SocialTab from "./components/SocialTab";
import About from "./components/About";
import Help from "./components/Help";
import SidebarChat from "./components/SocialTab/SidebarChat";


Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

const {Header, Content, Footer, Sider} = Layout;
class App extends Component {

    constructor(props) {
        super(props);
        // this.state ={'activeKey'=routing}
        this.router = React.createRef();

        // if(this.props.match.)
        this.state = {
            conference: null,
            showingLanding: this.props.authContext.showingLanding,
            socialCollapsed: false,
            chatCollapsed: false
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
            if(this.props.authContext && this.props.authContext.validConferences.length > 1 && this.isSlackAuthOnly()){
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
            }
            let clowdrActionButtons = <span>
                <Tooltip title="CLOWDR Support"><NavLink to="/help">    <Button size="small">Help</Button></NavLink></Tooltip>
                <Tooltip title="About CLOWDR"><NavLink to="/about"><Button size="small">About</Button></NavLink></Tooltip></span>
            if(confSwitcher){
                confSwitcher = <span style={{float: "right"}}>{confSwitcher} {clowdrActionButtons}</span>
            }
            else
                confSwitcher= <span style={{float: "right"}}>{clowdrActionButtons}</span>;
            if (headerImage)
                return <Header className="site-layout-background" style={{height: "140px", clear: "both"}}>
                    <img src={headerImage.url()} className="App-logo" height="140"
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
        if(this.props.authContext.showingLanding != this.state.showingLanding){
            this.setState({showingLanding: this.props.authContext.showingLanding});
        }
    }

    componentDidMount() {
        console.log(this.router.current)
        if (this.props.authContext.currentConference)
            this.refreshConferenceInformation();
    }

    refreshConferenceInformation() {
        this.setState({conference: this.props.authContext.currentConference});
    }

    routes() {
        if (this.isSlackAuthOnly()) {
            return <div><Route exact path="/" component={Lobby}/>
                <Route exact path="/fromSlack/:team/:roomName/:token" component={SlackToVideo}/>
                <Route exact path="/video/:conf/:roomName" component={VideoRoom}/>
                <Route exact path="/signout" component={SignOut}/>
                <Route exact path="/lobby" component={Lobby}/>
                <Route exact path="/signin" component={SignIn}/>
                <Route exact path="/about" component={About}/>
                <Route exact path="/help" component={Help} />

                <Route exact path="/lobby/new/:roomName" component={Lobby} /> {/* Gross hack just for slack */}

                <Route exact path="/admin" component={(props)=><SignIn {...props} dontBounce={true}/>} />
            </div>

        }
        return (<div>
            <Route exact path="/" component={Home}/>
            <Route exact path="/live" component={LiveStreaming}/>
            <Route exact path="/program" component={Program}/>
            <Route exact path="/fromSlack/:team/:roomName/:token" component={SlackToVideo}/>
            <Route exact path="/video/:conf/:roomName" component={VideoRoom}/>

            <Route exact path="/about" component={About}/>
            <Route exact path="/help" component={Help} />
            {/*<Route exact path="/channelList" component={ChannelList}/>*/}

            <Route exact path="/account" component={Account}/>
            <Route exact path="/videoChat/:roomId" component={VideoChat}/>
            <Route exact path="/lobby" component={Lobby}/>
            <Route exact path="/lobby/new/:roomName" component={Lobby} /> {/* Gross hack just for slack */}
            <Route exact path="/signup" component={SignUp}/>
            <Route exact path="/signin" component={SignIn}/>
            <Route exact path="/signout" component={SignOut}/>
            <Route exact path="/admin" component={(props)=><SignIn {...props} dontBounce={true}/>} />

            {/*<Route exact path='/admin/schedule' component={withAuthentication(ScheduleList)} />*/}
            {/*<Route exact path='/admin/users' component={withAuthentication(UsersList)} />*/}
            {/*<Route exact path='/admin/users/edit/:userID' component={withAuthentication(EditUser)} />*/}
            <Route exact path='/admin/livevideos' component={LiveVideosList}/>
        </div>)
    }

    toggleLobbySider() {
        this.setState({socialCollapsed: !this.state.socialCollapsed});
    }
    toggleChatSider() {
        this.setState({chatCollapsed: !this.state.chatCollapsed});
    }
    render() {
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
        return (
            <BrowserRouter basename={process.env.PUBLIC_URL} ref={this.router}>
                <div className="App">
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
                            <Layout>
                                <div className="lobbySessionTab" style={{left: (this.state.socialCollapsed?"0px":"250px")}}><Button onClick={this.toggleLobbySider.bind(this)}  size="small">Breakout Rooms {(this.state.socialCollapsed? ">":"x")}</Button> </div>
                                <div className="lobbySessionTab" style={{right: (this.state.chatCollapsed?"0px":"250px")}}><Button onClick={this.toggleChatSider.bind(this)}  size="small">{(this.state.chatCollapsed? "<":"x")} Chat</Button> </div>

                                <SocialTab collapsed={this.state.socialCollapsed}/>
                                <Content style={{margin: '24px 16px 0', overflow: 'initial'}}>
                                    <div className="site-layout-background" style={{padding: 24}}>
                                        {this.routes()}
                                    </div>
                                </Content>
                                <SidebarChat collapsed={this.state.chatCollapsed} />
                            </Layout>
                    </Layout>

                    {/* <div style={{position:
                    "sticky", bottom: 0}}>
                        <Chat />
                    </div> */}
                </div>
            </BrowserRouter>
        );
    }
}

export default withAuthentication(withGeoLocation(App));
