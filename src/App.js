import React, {Component} from 'react';
import {BrowserRouter, NavLink, Route} from 'react-router-dom';

import Home from "./components/Home"
import Lobby from "./components/Lobby"
import SignUp from "./components/SignUp"
import SignIn from "./components/SignIn"
import {Layout} from 'antd';
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
import withParseLive from "./components/parse/withParseLive";
import withGeoLocation from './components/GeoLocation/withGeoLocation';
// import EditUser from "./components/Admin/Users/EditUser";
// import ChannelList from "./components/ChannelList";
//import Chat from "./components/Chat";
import ContextualActiveUsers from "./components/Lobby/ContextualActiveusers";
import GenericHeader from "./components/GenericHeader";

Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY);
Parse.serverURL = process.env.REACT_APP_PARSE_DATABASE_URL;
console.log("Initialized Parse " + Parse.serverURL + ' ' + process.env.REACT_APP_PARSE_APP_ID);

const {Header, Content, Footer, Sider} = Layout;

class App extends Component {

    constructor(props) {
        super(props);
        // this.state ={'activeKey'=routing}
    }

    isSlackAuthOnly() {
        return process.env.REACT_APP_IS_MINIMAL_UI;
    }

    siteHeader() {
        if (this.isSlackAuthOnly()) {
            return <GenericHeader />
        } else {
            return <Header className="site-layout-background" style={{"height": "140px"}}>
                <img src={require('./' + process.env.REACT_APP_BACKGROUND_IMAGE)} width="800px" className="App-logo"
                     alt="logo"/>
            </Header>
        }
    }

    navBar() {
        if (this.isSlackAuthOnly()) {
            return <div></div>
        }
        return <Header><LinkMenu/></Header>

    }

    routes() {
        if (this.isSlackAuthOnly()) {
            return <div><Route exact path="/" component={Lobby}/>
                <Route exact path="/fromSlack/:team/:roomName/:token" component={SlackToVideo}/>
                <Route exact path="/video/:conf/:roomName" component={VideoRoom}/>
                <Route exact path="/signout" component={SignOut}/>
                <Route exact path="/lobby" component={Lobby}/>

            </div>

        }
       return (<div>
           <Route exact path="/" component={Home}/>
           <Route exact path="/live" component={LiveStreaming}/>
           <Route exact path="/program" component={Program}/>
           <Route exact path="/fromSlack/:team/:roomName/:token" component={SlackToVideo}/>
           <Route exact path="/video/:conf/:roomName" component={VideoRoom}/>


           {/*<Route exact path="/channelList" component={ChannelList}/>*/}

           <Route exact path="/account" component={Account}/>
           <Route exact path="/videoChat/:roomId" component={VideoChat}/>
           <Route exact path="/lobby" component={Lobby}/>
           <Route exact path="/signup" component={SignUp}/>
           <Route exact path="/signin" component={SignIn}/>
           <Route exact path="/signout" component={SignOut}/>

           {/*<Route exact path='/admin/schedule' component={withAuthentication(ScheduleList)} />*/}
           {/*<Route exact path='/admin/users' component={withAuthentication(UsersList)} />*/}
           {/*<Route exact path='/admin/users/edit/:userID' component={withAuthentication(EditUser)} />*/}
           <Route exact path='/admin/livevideos' component={LiveVideosList}/>
       </div>)
    }

    render() {
        return (
            <BrowserRouter basename={process.env.PUBLIC_URL}>
                <div className="App">
                    <Layout className="site-layout">
                        {this.siteHeader()}
                        <Layout>
                                {this.navBar()}
                            <Layout>

                                <Content style={{margin: '24px 16px 0', overflow: 'initial'}}>
                                    <div className="site-layout-background" style={{padding: 24}}>
                                        {this.routes()}
                                    </div>
                                </Content>
                                <Sider style={{width: "250px"}}>
                                    <ContextualActiveUsers/>
                                </Sider>
                            </Layout>
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

export default withAuthentication(withParseLive(withGeoLocation(App)));
