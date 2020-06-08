import React, {Component} from "react";
import {Badge, Layout, Tabs} from "antd";
import ContextualActiveUsers from "../Lobby/ContextualActiveusers";
import {ArrowRightOutlined, CloseOutlined} from '@ant-design/icons'
import {AuthUserContext} from "../Session";

class SocialTab extends Component {
    constructor(props) {
        super(props);
        this.state = {siderCollapsed: false}
    }
    setCollapsed(collapsed) {
        this.setState({siderCollapsed: collapsed});
    }
    componentDidMount() {
    }
    expandTab() {
        this.setCollapsed(!this.state.siderCollapsed);
    }
    render() {
        return <Layout.Sider collapsible collapsed={this.state.siderCollapsed}
                             trigger={null}
                             onCollapse={this.setCollapsed.bind(this)} width="350px"
                             collapsedWidth={100}
                             style={{backgroundColor: '#f0f2f5'}}>
            <div id="sidepopoutcontainer" style={{
                height: '100vh',
                margin: '0 0 0 auto',
                // zIndex: "5",
                // right: 0
            }}>
                <Tabs tabPosition="right" style={{height: '100vh'}}
                      type="card"

                >
                    <Tabs.TabPane
                        tab=
                            {<span onClick={this.expandTab.bind(this)} style={{paddingLeft: "0px", verticalAlign: "middle"}}>Lobby<Badge
                                title={this.props.auth.liveVideoRoomMembers + " user"+(this.props.auth.liveVideoRoomMembers == 1 ? " is" : "s are")+" in video chats"}
                                showZero={true} style={{backgroundColor: '#52c41a'}} count={this.props.auth.liveVideoRoomMembers} offset={[-2,-20]}></Badge>{!this.state.collapsed ?
                                <CloseOutlined style={{verticalAlign: 'middle'}}/> :
                                <ArrowRightOutlined style={{verticalAlign: 'middle'}}/>}</span>}
                        key="general" style={{backgroundColor: '#f0f2f5',
                        overflow: 'auto',
                        // width: "350px",
                        border: '2px solid #c1c1c1',
                        height: '100vh'}}>
                    <ContextualActiveUsers collapsed={this.state.siderCollapsed}
                                           setCollapsed={this.setCollapsed.bind(this)}/>
                    </Tabs.TabPane>
                </Tabs></div>
        </Layout.Sider>
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
