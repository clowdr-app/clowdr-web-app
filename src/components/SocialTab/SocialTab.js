import React, { Component } from "react";
import ContextualActiveUsers from "../Lobby/ContextualActiveusers";
import { AuthUserContext } from "../Session";

class SocialTab extends Component {
    constructor(props) {
        super(props);

        this.state = { visible: false }
    }
    componentWillUnmount() {
    }
    componentDidMount() {
        this.props.auth.refreshUser().then((u) => {
            if (u && u.get("passwordSet")) {
                this.setState({ visible: true });
            }
        })
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (!this.state.visible && this.props.auth.user && this.props.auth.user.get("passwordSet")) {
            this.setState({ visible: true });
        }
    }


    render() {
        if (!this.state.visible) {
            return <div></div>
        }


        return <div className="activeRoomsTab">


            {/*<Layout.Sider collapsible collapsed={this.state.siderWidth === 0}*/}
            {/*                 trigger={null}*/}
            {/*              className="activeRoomsSider"*/}
            {/*              width={this.state.siderWidth}*/}
            {/*                 collapsedWidth={0}*/}
            {/*                 theme="light"*/}
            {/*              style={{backgroundColor: '#f8f8f8',*/}
            {/*                  overflowY:"auto",*/}
            {/*                  overflowX:"hidden",*/}
            {/*                  overflowWrap:"break-word",*/}
            {/*                  height:"100%",*/}
            {/*                  boxSizing:  "border-box",*/}
            {/*                  width: this.state.siderWidth}}>*/}

            <div id="sidepopoutcontainer" style={{
            }}>
                {this.props.auth.watchParty ? <></> : <ContextualActiveUsers collapsed={this.state.siderWidth === 0} />}


            </div>
            {/*</Layout.Sider>*/}

        </div>
    }
}
const AuthConsumer = (props) => (
    // <Router.Consumer>
    //     {router => (
    <AuthUserContext.Consumer>
        {value => (
            <SocialTab {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
    // )}</Router.Consumer>

);

export default AuthConsumer;
