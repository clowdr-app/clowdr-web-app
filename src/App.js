import React, {Component} from 'react';
import {BrowserRouter, Route} from 'react-router-dom';

import Home from "./components/Home"
import Lobby from "./components/Lobby"
import SignUp from "./components/SignUp"
import SignIn from "./components/SignIn"
import {Affix, Layout} from 'antd';
import './App.css';
import LinkMenu from "./components/linkMenu";
import SignOut from "./components/SignOut";
import {withAuthentication} from "./components/Session";

import Parse from "parse";


import Account from "./components/Account";
import VideoChat from "./components/VideoChat";
// import ScheduleList from "./components/Admin/Schedule";
// import UsersList from "./components/Admin/Users";
//
import LiveVideosList from "./components/Admin/LiveVideos";
import withParseLive from "./components/parse/withParseLive";
// import EditUser from "./components/Admin/Users/EditUser";
// import ChannelList from "./components/ChannelList";
import Chat from "./components/Chat";

Parse.initialize(process.env.REACT_APP_PARSE_APP_ID, process.env.REACT_APP_PARSE_JS_KEY);
Parse.serverURL = 'https://parseapi.back4app.com/'

const {Header, Content, Footer, Sider} = Layout;



class App extends Component {

    constructor(props) {
        super(props);
        // this.state ={'activeKey'=routing}
    }

    render() {


        return (
            <BrowserRouter basename={process.env.PUBLIC_URL}>
                <div className="App">
                    <Layout className="site-layout">
                        <Header className="site-layout-background" style={{"height": "140px"}}>
                            <img src={require('./icse2020-logo.png')} width="800px" className="App-logo" alt="logo"/>
                        </Header>
                        <Layout>
                            <Sider>
                                <LinkMenu/>
                            </Sider>
                            <Content style={{margin: '24px 16px 0', overflow: 'initial'}}>
                                <div className="site-layout-background" style={{padding: 24}} >
                                    <Route exact path="/" component={Home}/>
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
                                    <Route exact path='/admin/livevideos' component={LiveVideosList} />
                                    <Affix offsetBottom={10}>
                                        <Chat />
                                    </Affix>
                                </div>
                            </Content>
                        </Layout>
                    </Layout>
                </div>
            </BrowserRouter>
        );
    }
}

export default withAuthentication(withParseLive(App));
