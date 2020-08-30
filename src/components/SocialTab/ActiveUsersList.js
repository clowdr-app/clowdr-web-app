import React from "react";
import { AuthUserContext } from "../Session";
import { Divider, Menu, Tooltip } from "antd";
import PresenceForm from "../Lobby/PresenceForm";
import UserStatusDisplay from "../Lobby/UserStatusDisplay";

class ActiveUsersList extends React.Component {
    constructor(props) {
        super(props);
        this.state = { loggedIn: false };
    }
    componentDidMount() {
        let user = this.props.auth.user;
        if (user) {
            this.props.auth.helpers.getPresences(this);
            this.setState({ loggedIn: true });
        } else {
            this.setState({ loggedIn: false });
        }

    }

    render() {
        if (!this.state.loggedIn) {
            return <div></div>
        }

        const compareNames = (a, b) => {
            a = a.get("displayName");
            b = b.get("displayName");
            if (!a)
                return -1;
            if (!b) return 1;
            return (a.localeCompare(b))
        };
        let lobbyMembers = [];
        if (this.state.presences && this.props.auth.activeSpace) {
            lobbyMembers = Object.values(this.state.presences)
                .filter(p =>
                    p
                    && p.get("socialSpace")
                    && p.get("socialSpace").id === this.props.auth.activeSpace.id
                    && (!this.state.filteredUser || this.state.filteredUser === p.get("user").id)
                ).map(p => p.get("user")).sort(compareNames);
        }
        let latestLobbyMembers = lobbyMembers.concat().sort((i1, i2) => {
            return (i1 && i2 && i1.get("updatedAt") > i2.get("updatedAt") ? 1 : -1)
        }).slice(0, 10);
        let activeSpace = this.props.auth.activeSpace ? this.props.auth.activeSpace.get("name") : "Nowhere";

        return <div>
            <Divider className="social-sidebar-divider">
                <Tooltip mouseEnterDelay={0.5} title="Social features in CLOWDR are organized around different 'rooms' that represent different aspects of the conference. The list below shows who else is in this room, right now.">{activeSpace}</Tooltip>
            </Divider>
            <div><PresenceForm /></div>

            <Menu mode="inline"
                className="activeRoomsList"
                // style={{height: "calc(100vh - "+ topHeight+ "px)", overflowY:"auto", overflowX:"visible"}}
                style={{
                    // height: "100%",
                    // overflow: 'auto',
                    // display: 'flex',
                    // flexDirection: 'column-reverse',
                    border: '1px solid #FAFAFA'

                }}
                inlineIndent={0}
                defaultOpenKeys={['firstUsers']}
                forceSubMenuRender={true}
                expandIcon={null}
            >
                <Menu.SubMenu key="firstUsers" expandIcon={<span></span>}>

                    {latestLobbyMembers.map((user) => {
                        let className = "personHoverable";
                        if (this.state.filteredUser === user.id)
                            className += " personFiltered"
                        return <Menu.Item key={"latest" + user.id} className={className}>
                            <UserStatusDisplay popover={true} profileID={user.id} />
                        </Menu.Item>
                    })
                    }
                </Menu.SubMenu>{
                    <Menu.SubMenu key="restUsers"
                        title={<div className="overflowHelper">{lobbyMembers.length} total</div>}>

                        {lobbyMembers.map((user) => {
                            let className = "personHoverable";
                            if (this.state.filteredUser === user.id)
                                className += " personFiltered"
                            return <Menu.Item key={user.id} className={className}>
                                <UserStatusDisplay popover={true} profileID={user.id} />
                            </Menu.Item>
                        })
                        }
                    </Menu.SubMenu>
                }
            </Menu>

        </div>
    }
}
const AuthConsumer = (props) => (
    // <Router.Consumer>
    //     {router => (
    <AuthUserContext.Consumer>
        {value => (
            <ActiveUsersList {...props} auth={value} />
        )}
    </AuthUserContext.Consumer>
    // )}</Router.Consumer>

);

export default AuthConsumer
