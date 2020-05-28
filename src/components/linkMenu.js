import {NavLink} from "react-router-dom";
import {Menu} from "antd";
import React from "react";
import {
    AuthUserContext,
} from './Session';
import {
    CalendarOutlined,
    CloseSquareOutlined,
    DesktopOutlined,
    SmileOutlined,
    TeamOutlined,
    ToolOutlined,
    UserOutlined,
    VideoCameraAddOutlined,
    VideoCameraOutlined,
    YoutubeOutlined
} from '@ant-design/icons';
import SubMenu from "antd/es/menu/SubMenu";
import {withRouter} from "react-router";

class LinkMenu extends React.Component {

    constructor(props) {
        super(props);
    }

    componentDidMount() {
    }

    render() {
        let userTools = [];
        let adminTools = "";
        if (this.props.user) {
            adminTools = <SubMenu key="/admin" title={<span><ToolOutlined/><span>Administration</span></span>}>
                <Menu.Item key='/admin/liveVideos' icon={<VideoCameraAddOutlined/>}><NavLink to="/admin/liveVideos">
                    Live Videos</NavLink></Menu.Item>
                <Menu.Item key='/admin/schedule' icon={<CalendarOutlined/>}><NavLink to="/admin/schedule">
                    Schedule</NavLink></Menu.Item>

                <Menu.Item key='/admin/users' icon={<UserOutlined/>}><NavLink to="/admin/users">
                    Users</NavLink></Menu.Item>
            </SubMenu>
            userTools =
                [
                    <Menu.Item key='/lobby' icon={<TeamOutlined/>}><NavLink to="/lobby">Lobby</NavLink></Menu.Item>,
                    <Menu.Item key='/account' icon={<UserOutlined/>}><NavLink to="/account">
                        My Account</NavLink></Menu.Item>
                    ];
            userTools.push(adminTools);
            userTools.push(<Menu.Item key='/signout' icon={<CloseSquareOutlined/>}><NavLink to="/signout">Sign
                Out</NavLink></Menu.Item>);
            ;

        } else {
            userTools =
                [<Menu.Item key='/signup' icon={<SmileOutlined/>}><NavLink to="/signup">Sign Up</NavLink></Menu.Item>,
                    <Menu.Item key='/signin' icon={<DesktopOutlined/>}><NavLink to="/signin">Sign
                        In</NavLink></Menu.Item>
                ]
        }
        return <Menu theme={"dark"} mode={"inline"} selectedKeys={[this.props.location.pathname]}
                     mode="horizontal"
                     >
            <Menu.Item key='/' icon={<VideoCameraOutlined/>}><NavLink to="/">Live
                Videos</NavLink></Menu.Item>
            <Menu.Item key='/channelList' icon={<YoutubeOutlined/>}><NavLink to="/channelList">Recorded Videos</NavLink></Menu.Item>
            {userTools}
        </Menu>;
    }
}
let RouteredMenu = withRouter(LinkMenu);
const MenuWithAuth = () => (
    <AuthUserContext.Consumer>
        {value => (
            <RouteredMenu user={value.user} refreshUser={value.refreshUser}/>
        )}
    </AuthUserContext.Consumer>
);

export default withRouter(MenuWithAuth);