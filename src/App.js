import React, { Component } from 'react';
import { BrowserRouter, NavLink, Route } from 'react-router-dom';
import BrowserDetection from 'react-browser-detection';
import { Button, Layout, message, Select, Spin, Tooltip, Typography, Upload } from 'antd';

import Home from "./components/Home"
import Lobby from "./components/Lobby"
import SignIn from "./components/SignIn"
import AccountFromToken from "./components/Account/AccountFromToken"
import { UploadOutlined } from '@ant-design/icons';
import './App.css';
import LinkMenu from "./components/linkMenu";
import SignOut from "./components/SignOut";
import Moderation from "./components/Moderation";

import { Program } from "./components/Program";
import VideoRoom from "./components/VideoChat/VideoRoom"

import { withAuthentication } from "./components/Session";

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
import Clowdr from "./components/Admin/Clowdr";
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
import BottomChat from "./components/SocialTab/BottomChat";
import ProgramItem from "./components/ProgramItem";
import UsersList from "./components/Admin/Users";
import SplitPane from 'react-split-pane/lib/SplitPane';
import Pane from 'react-split-pane/lib/Pane'
import ActiveUsersList from "./components/SocialTab/ActiveUsersList";
import EmojiPickerPopover from "./components/Chat/EmojiPickerPopover";


Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;

const { Header, Content } = Layout;
class App extends Component {

    constructor(props) {
        super(props);
        // this.state ={'activeKey'=routing}

        this.chatSize = "300px";
        this.chatPaneRef = React.createRef();
        // if(this.props.match.)
        this.state = {
            showingLanding: this.props.clowdrAppState.showingLanding,
            socialCollapsed: false,
            chatCollapsed: false,
            chatHeight: this.chatSize,
            dirty: false,
            isShowOtherPanes: false,
        }
    }

    dirty() {
        this.setState({ dirty: !this.state.dirty })
    }

    onLogoUpload(file) {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('You can only upload JPG/PNG file!');
            return false;
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Image must be smaller than 2MB!');
            return false;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const data = {
                content: reader.result,
                conferenceId: this.props.clowdrAppState.currentConference.id
            };

            Parse.Cloud.run("logo-upload", data).then(async (res) => {
                message.info("Success! Your logo has been uploaded.");
                let updatedItemQ = new Parse.Query("ClowdrInstance");
                let updatedItem = await updatedItemQ.get(this.props.clowdrAppState.currentConference.id);

                this.props.clowdrAppState.currentConference.set("headerImage", updatedItem.get("headerImage")); //well that is gross
                console.log(res);
                console.log('[App]: Logo uploaded successfully');
                this.dirty();
            });
        }
        reader.readAsDataURL(file);
        return false;
    }

    navBar() {
        let logo = undefined;
        let className = "logo"
        let headerImage = this.props.clowdrAppState.currentConference.get("headerImage");
        if (headerImage) {
            if (this.props.clowdrAppState.user && this.props.clowdrAppState.isAdmin) {
                logo = <Upload style={{ verticalAlign: "top" }} accept=".png, .jpg" name='logo' beforeUpload={this.onLogoUpload.bind(this)} fileList={[]}>
                    <img src={headerImage.url()} height="50" alt="logo" title="Click to replace logo" />
                </Upload>
            }
            else
                logo = <img src={headerImage.url()} height="50" alt="logo" />

        }
        else {
            if (this.props.clowdrAppState.user && this.props.clowdrAppState.isAdmin) {
                logo = <Upload accept=".png, .jpg" name='logo' beforeUpload={this.onLogoUpload.bind(this)} fileList={[]}>
                    <Button type="primary" size="small" title="Upload conference logo">
                        <UploadOutlined />
                    </Button>
                </Upload>
            }
            if (!logo)
                className = "missing-logo";
        }
        return <Header><div className={className}>{logo}</div><LinkMenu /></Header>

    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.state.chatHeight !== prevState.chatHeight && this.state.chatHeight !== this.chatSize) {
            this.chatSize = this.state.chatHeight;
            this.chatPaneRef.current.setState({ sizes: ["1", this.state.chatHeight] });
        }
        if (this.props.clowdrAppState.showingLanding !== this.state.showingLanding) {
            this.setState({ showingLanding: this.props.clowdrAppState.showingLanding });
        }
        if (!this.state.isShowOtherPanes && this.props.clowdrAppState.user && this.props.clowdrAppState.user.get("passwordSet"))
            this.setState({ isShowOtherPanes: true });
    }

    componentDidMount() {
        if (this.props.clowdrAppState.user && this.props.clowdrAppState.user.get("passwordSet"))
            this.setState({ isShowOtherPanes: true });

        localStorage.setItem('leftPaneSize', '250');
        localStorage.setItem('rightPaneSize', '250');

    }

    routes() {
        let baseRoutes = [
            <Route key="finishAccount" exact path="/finishAccount/:userID/:conferenceID/:token" component={AccountFromToken} />,
            <Route key="forgotPassword" exact path="/resetPassword/:userID/:token" component={ForgotPassword} />
        ];
        return <>
            {baseRoutes}
            <Route exact path="/" component={Home} />
            <Route exact path="/breakoutRoom/:programConfKey1/:programConfKey2" component={ProgramItem} />
            <Route exact path="/program/:programConfKey1/:programConfKey2" component={ProgramItem} />
            <Route exact path="/live/:when/:roomName?" component={LiveVideosArea} />

            <Route exact path="/program" component={Program} />

            <Route exact path="/exhibits/:track/:style" component={Exhibits} />
            {/* <Route exact path="/exhibits/srcposters" component={SRCPosters}/> */}

            <Route exact path="/video/:parseRoomID" component={VideoRoom} />

            <Route exact path="/video/:conf/:roomName" component={VideoRoom} />
            <Route exact path="/moderation" component={Moderation} />

            <Route exact path="/about" component={About} />
            <Route exact path="/help" component={Help} />
            {/*<Route exact path="/channelList" component={ChannelList}/>*/}

            <Route exact path="/account" component={Account} />
            <Route exact path="/videoChat/:roomId" component={VideoChat} />
            <Route exact path="/lobby" component={Lobby} />
            {/* <Route exact path="/signup" component={SignUp}/> */}
            <Route exact path="/signin" component={SignIn} />
            <Route exact path="/signout" component={SignOut} />
            <Route exact path="/admin" component={(props) => <SignIn {...props} dontBounce={true} />} />

            {/*<Route exact path='/admin/schedule' component={withRouter(withAuthentication(ScheduleList))} />*/}
            <Route exact path='/admin/users' component={UsersList} />
            {/*<Route exact path='/admin/users/edit/:userID' component={withRouter(withAuthentication(EditUser))} />*/}
            <Route exact path='/admin/clowdr' component={Clowdr} />
            <Route exact path='/admin/configuration' component={Configuration} />
            <Route exact path='/admin/registrations' component={Registrations} />
            <Route exact path='/admin/program/rooms' component={Rooms} />
            <Route exact path='/admin/program/tracks' component={Tracks} />
            <Route exact path='/admin/program/items' component={ProgramItems} />
            <Route exact path='/admin/program/sessions' component={ProgramSessions} />
            <Route exact path='/admin/program/programSummary' component={ProgramSummary} />
        </>;
    }

    toggleLobbySider() {
        this.setState({ socialCollapsed: !this.state.socialCollapsed });
    }
    toggleChatSider() {
        this.setState({ chatCollapsed: !this.state.chatCollapsed });
    }

    setChatWidth(w) {
        this.setState({ chatWidth: w });
    }
    setLobbyWidth(w) {
        this.setState({ lobbyWidth: w });
    }
    render() {
        if (this.state.showingLanding) {
            return <GenericLanding />
        }
        if (!this.props.clowdrAppState.currentConference) {
            if (this.state.loadingUser) {
                return <div style={{
                    height: "100vh",
                    width: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <Spin />
                </div>
            }
        }
        let topHeight = 0;
        let topElement = document.getElementById("top-content");
        if (topElement)
            topHeight = topElement.clientHeight;

        let leftPaneSize = localStorage.getItem("leftPaneSize") ? localStorage.getItem("leftPaneSize") + "px" : "250px";
        let rightPaneSize = localStorage.getItem("rightPaneSize") ? localStorage.getItem("rightPaneSize") + "px" : "250px";

        return (
            <div className="App">
                <EmojiPickerPopover />
                <div>
                    <Layout className="site-layout">
                        <div id="top-content">
                            {this.navBar()}
                        </div>

                        <Content>

                            <div className="main-area" style={{ height: "calc(100vh - " + (topHeight) + "px)", overflow: "auto" }}>

                                <SplitPane
                                    onChange={(sizes) => {
                                        localStorage.setItem('leftPaneSize', sizes[0]);
                                        localStorage.setItem('rightPaneSize', sizes[2]);
                                    }}
                                >
                                    {/* Left side Pane */}
                                    <Pane initialSize={this.state.isShowOtherPanes ? leftPaneSize : 0}>
                                        <SocialTab collapsed={this.state.socialCollapsed} />
                                    </Pane>
                                    {/* Middle Pane */}
                                    <Pane>
                                        <div className="middlePane">
                                            <SplitPane split="horizontal" ref={this.chatPaneRef} onChange={(sizes) => {
                                                this.chatSize = sizes[1];
                                            }}>
                                                <Pane>
                                                    <div className="page-content">

                                                        {/*<div className="site-layout-background" style={{padding: 24}}>*/}
                                                        {this.routes()}
                                                        {/*</div>*/}
                                                    </div>

                                                </Pane>
                                                <Pane initialSize={this.state.isShowOtherPanes ? this.chatSize : 0}>
                                                    <BottomChat setChatWindowHeight={(height) => this.setState({ chatHeight: height })} />
                                                </Pane>
                                            </SplitPane>
                                        </div>
                                    </Pane>
                                    {/* Right side Pane */}
                                    <Pane initialSize={this.state.isShowOtherPanes ? rightPaneSize : 0}>
                                        <div className="chatTab" id="rightPopout">
                                            <div id="activeUsersList"><ActiveUsersList /></div>
                                            <div id="sidebarChat"><SidebarChat collapsed={this.state.chatCollapsed} /></div>
                                        </div>
                                    </Pane>
                                </SplitPane>
                            </div>
                        </Content>
                    </Layout>
                </div>
            </div>
        );
    }
}

class ClowdrApp extends React.Component {
    okBrowser = () => <></>;
    browserHandler = {
        chrome: this.okBrowser,
        edge: this.okBrowser,
        safari: this.okBrowser,
        default: this.okBrowser
    };

    render() {
        return <BrowserRouter basename={process.env.PUBLIC_URL}>
            <BrowserDetection>
                {this.browserHandler}
            </BrowserDetection>
            <App {...this.props} />
        </BrowserRouter>
    }
}

export default withAuthentication(ClowdrApp);
