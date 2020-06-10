import React, {Component} from "react";
import {Badge, Button, Layout, Tabs} from "antd";
import ContextualActiveUsers from "../Lobby/ContextualActiveusers";
import {ArrowRightOutlined, CloseOutlined} from '@ant-design/icons'
import {AuthUserContext} from "../Session";
import SidebarChat from "./SidebarChat";

class SocialTab extends Component {
    constructor(props) {
        super(props);
        this.state = {siderCollapsed: this.props.collapsed}
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if(this.props.collapsed != this.state.siderCollapsed){
          this.setState({siderCollapsed: this.props.collapsed})
        }
    }

    render() {
        let topHeight = 0;
        let topElement = document.getElementById("top-content");
        if(topElement)
            topHeight = topElement.clientHeight;

        return <div style={{height: "calc(100vh - "+topHeight+"px)"}}>

            <Layout.Sider collapsible collapsed={this.state.siderCollapsed}
                             trigger={null}
                          width="250px"
                             collapsedWidth={0}
                             theme="light"
                             style={{backgroundColor: '#f8f8f8', height: "100%"}}>
            <div id="sidepopoutcontainer" style={{
                overflowY: "auto"
                // height: '100vh',
                // margin: '0 0 0 auto',
                // // zIndex: "5",
                // // right: 0
                // backgroundColor: 'white',
                // overflow: 'hidden',
                // width: "350px",
                // // height: '100vh'
            }}>
                    <ContextualActiveUsers collapsed={this.state.siderCollapsed}/>

                </div>
        </Layout.Sider>
        </div>
    }
}
const AuthConsumer = (props) => (
    // <Router.Consumer>
    //     {router => (
            <AuthUserContext.Consumer>
                {value => (
                    <SocialTab {...props} auth={value}/>
                )}
            </AuthUserContext.Consumer>
    // )}</Router.Consumer>

);

export default AuthConsumer;
