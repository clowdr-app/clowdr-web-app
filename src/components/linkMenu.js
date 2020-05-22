import {NavLink, withRouter} from "react-router-dom";
import {Menu} from "antd";
import React from "react";
import {withAuthentication} from "./Session"

import {
    CalendarOutlined,
    CloseSquareOutlined,
    DesktopOutlined,
    SmileOutlined,
    TeamOutlined,
    ToolOutlined,
    UserOutlined,
    VideoCameraAddOutlined,
    YoutubeOutlined,
    VideoCameraOutlined
} from '@ant-design/icons';
import SubMenu from "antd/es/menu/SubMenu";

const LinkMenu = withRouter(
    props => {
        const {location} = props;
        let userTools = [];
        let adminTools = "";
        if (props.firebase.auth.currentUser) {
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
                    <Menu.Item key='/account' icon={<UserOutlined/>}><NavLink to="/account">
                        My Account</NavLink></Menu.Item>,
                    <Menu.Item key='/lobby' icon={<TeamOutlined/>}><NavLink to="/lobby">Lobby
                        Session</NavLink></Menu.Item>];
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
        return <Menu theme={"dark"} mode={"inline"} selectedKeys={[location.pathname]} defaultOpenKeys="/admin">
            <Menu.Item key='/' icon={<VideoCameraOutlined/>}><NavLink to="/">Live
                Videos</NavLink></Menu.Item>
            <Menu.Item key='/channelList' icon={<YoutubeOutlined />}><NavLink to="/channelList">Recorded Videos</NavLink></Menu.Item>
            {userTools}
        </Menu>;
    }
);
export default withAuthentication(LinkMenu);