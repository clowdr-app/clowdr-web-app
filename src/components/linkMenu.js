import {NavLink, withRouter} from "react-router-dom";
import {Menu} from "antd";
import React from "react";
import {withAuthentication} from "./Session"

import {SmileOutlined, TeamOutlined, VideoCameraOutlined} from '@ant-design/icons';

const LinkMenu = withRouter(
    props => {
        const {location} = props;
        let userTools = [];
        console.log(props.firebase.auth.currentUser)
        if (props.firebase.auth.currentUser) {
            userTools =
                [
                    <Menu.Item key='/lobby' icon={<TeamOutlined/>}><NavLink to="/lobby">Lobby
                        Session</NavLink></Menu.Item>,
                    <Menu.Item key='/signout' icon={<TeamOutlined/>}><NavLink to="/signout">Sign
                        Out</NavLink></Menu.Item>]
            ;
        } else {
            userTools =
                [<Menu.Item key='/signup' icon={<SmileOutlined/>}><NavLink to="/signup">Sign Up</NavLink></Menu.Item>,
                    <Menu.Item key='/signin' icon={<TeamOutlined/>}><NavLink to="/signin">Sign In</NavLink></Menu.Item>
                ]
        }
        return <Menu theme={"dark"} mode={"inline"} selectedKeys={[location.pathname]}>
            {userTools}
            <Menu.Item key='/' icon={<VideoCameraOutlined/>}><NavLink to="/">Live
                Videos</NavLink></Menu.Item>
        </Menu>;
    }
);
export default withAuthentication(LinkMenu);