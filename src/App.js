import React, {Component} from 'react';
import {BrowserRouter, Route, withRouter} from 'react-router-dom';

import Home from "./components/Home"
import Lobby from "./components/Lobby"
import SignUp from "./components/SignUp"
import SignIn from "./components/SignIn"
import {Layout} from 'antd';
import './App.css';
import LinkMenu from "./components/linkMenu";
import SignOut from "./components/SignOut";
import {withAuthentication} from "./components/Session";
import Account from "./components/Account";
import VideoChat from "./components/VideoChat";
import ScheduleList from "./components/Admin/Schedule";
import UsersList from "./components/Admin/Users";

import LiveVideosList from "./components/Admin/LiveVideos";
import EditUser from "./components/Admin/Users/EditUser";
import ChannelList from "./components/ChannelList";
import {withFirebase} from "./components/Firebase";

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
                                <div className="site-layout-background" style={{padding: 24, textAlign: 'center'}}>
                                    <Route exact path="/" component={Home}/>
                                    <Route exact path="/channelList" component={withFirebase(ChannelList)}/>

                                    <Route exact path="/account" component={withAuthentication(Account)}/>
                                    <Route exact path="/videoChat/:roomId" component={withAuthentication(VideoChat)}/>
                                    <Route exact path="/lobby" component={withAuthentication(Lobby)}/>
                                    <Route exact path="/signup" component={SignUp}/>
                                    <Route exact path="/signin" component={withAuthentication(SignIn)}/>
                                    <Route exact path="/signout" component={withAuthentication(SignOut)}/>

                                    <Route exact path='/admin/schedule' component={withAuthentication(ScheduleList)} />
                                    <Route exact path='/admin/users' component={withAuthentication(UsersList)} />
                                    <Route exact path='/admin/users/edit/:userID' component={withAuthentication(EditUser)} />
                                    <Route exact path='/admin/livevideos' component={withAuthentication(LiveVideosList)} />
                                </div>
                            </Content>
                        </Layout>
                    </Layout>
                </div>
            </BrowserRouter>
        );
    }
}

export default App;
