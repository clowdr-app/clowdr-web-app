import {NavLink} from "react-router-dom";
import {Menu} from "antd";
import React from "react";
import {
    AuthUserContext,
} from './Session';
import {
    BankOutlined,
    BarsOutlined,
    BorderOutlined,
    CalendarOutlined,
    CloseSquareOutlined,
    ContainerOutlined,
    DesktopOutlined,
    IdcardOutlined,
    HomeOutlined,
    ReadOutlined,
    SmileOutlined,
    ScheduleOutlined,
    SlidersOutlined,
    SolutionOutlined,
    SyncOutlined,
    TeamOutlined,
    ToolOutlined,
    UserOutlined,
    VideoCameraAddOutlined,
    VideoCameraOutlined,
    VideoCameraTwoTone,
    WechatOutlined,
    YoutubeOutlined
} from '@ant-design/icons';
import SubMenu from "antd/es/menu/SubMenu";
import {withRouter} from "react-router";
import {ProgramContext} from "./Program";


class LinkMenu extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            ProgramTracks: []
        }
    }

    componentDidMount() {
        this.props.authContext.programCache.getProgramTracks(this).then(tracks => {
            this.setState({ProgramTracks: tracks});
        })
    }
    componentWillUnmount() {
        this.props.authContext.programCache.cancelSubscription("ProgramTrack", this);
    }

    render() {
        let userTools = [];
        let adminTools = "";
        if (this.props.authContext.user) {
            if(this.props.authContext.isAdmin) {
                adminTools = <SubMenu key="/admin" title={<span><ToolOutlined/><span>Administration</span></span>}>
                    <Menu.Item key='/admin/program/rooms' icon={<BankOutlined/>}><NavLink to="/admin/program/rooms">
                        Virtual Rooms</NavLink></Menu.Item>

                    <Menu.Item key='/admin/program/tracks' icon={<ContainerOutlined/>}><NavLink to="/admin/program/tracks">
                    Conference Tracks</NavLink></Menu.Item>

                    <Menu.Item key='/admin/program/items' icon={<BarsOutlined/>}><NavLink to="/admin/program/items">
                    Program Items</NavLink></Menu.Item>

                    <Menu.Item key='/admin/program/sessions' icon={<CalendarOutlined/>}><NavLink to="/admin/program/sessions">
                    Program Sessions</NavLink></Menu.Item>

                    <Menu.Item key='/admin/program/programSummary' icon={<SolutionOutlined/>}><NavLink to="/admin/program/programSummary">
                        Program</NavLink></Menu.Item>

                    <Menu.Item key='/admin/registrations' icon={<IdcardOutlined/>}><NavLink to="/admin/registrations">
                        Registrations</NavLink></Menu.Item>

                    <Menu.Item key='/admin/users' icon={<UserOutlined/>}><NavLink to="/admin/users">
                    Users</NavLink></Menu.Item>

                    <Menu.Item key='/admin/configuration' icon={<SlidersOutlined/>}><NavLink to="/admin/configuration">
                        Conference Configuration</NavLink></Menu.Item>
                </SubMenu>
            }
            userTools =
                [
                    <Menu.Item key='/program' icon={<ScheduleOutlined />}><NavLink to="/program">Program</NavLink></Menu.Item>,

                    <SubMenu key="/live" title={<span><VideoCameraOutlined/><span>Sessions</span></span>}>
                        <Menu.Item key='/live/now' icon={<VideoCameraTwoTone twoToneColor="red"/>}><NavLink to="/live/now">Live Sessions</NavLink></Menu.Item>,
                        <Menu.Item key='/live/past' icon={<YoutubeOutlined/>}><NavLink to="/live/past">Past Sessions</NavLink></Menu.Item>
                    </SubMenu>,

                    <SubMenu key="/exhibits" title={<span><TeamOutlined/><span>Exhibit Hall</span></span>}>
                        {this.state.ProgramTracks
                        .filter(track => track.get("exhibit") == "Grid" || track.get("exhibit") == "List")
                        .map(track => {
                            let mode = track.get("exhibit");
                            let path = track.get("name");
                            let displayName = track.get("displayName");
                        return <Menu.Item key={`/exhibits/${path}`} icon={<ReadOutlined/>}> <NavLink to={`/exhibits/${path}/${mode}`}>{displayName}</NavLink></Menu.Item>

                        })}
                    </SubMenu>,

                    <Menu.Item key='/lobby' icon={<WechatOutlined/>}><NavLink to="/lobby">Video Chat Lobby</NavLink></Menu.Item>,

                    <Menu.Item key='/account' icon={<UserOutlined/>}><NavLink to="/account">My Account</NavLink></Menu.Item>,

                    <SubMenu key="conf-select" title="Select Conference">
                        {
                            this.props.authContext.validConferences.map((conf)=><Menu.Item key={conf.id} onClick={this.props.authContext.helpers.setActiveConference.bind(this,conf)}>{conf.get("conferenceName")}</Menu.Item>)
                        }
                    </SubMenu>
                    ];
            userTools.push(adminTools);
            userTools.push(<Menu.Item key='/signout' icon={<CloseSquareOutlined/>}><NavLink to="/signout">Sign Out</NavLink></Menu.Item>);
            ;

        } else {
            userTools =
                [
                <Menu.Item key='/program' icon={<ScheduleOutlined />}><NavLink to="/program">Program</NavLink></Menu.Item>,

//                <Menu.Item key='/signup' icon={<SmileOutlined/>}><NavLink to="/signup">Sign Up</NavLink></Menu.Item>,

                <Menu.Item key='/signin' icon={<DesktopOutlined/>}><NavLink to="/signin">Sign In</NavLink></Menu.Item>
                ];
        }
        return <Menu theme={"dark"} mode={"inline"} selectedKeys={[this.props.location.pathname]} mode="horizontal">
                <Menu.Item key='/' icon={<HomeOutlined/>}><NavLink to="/">Home</NavLink></Menu.Item>
                {userTools}
        </Menu>;
    }
}
let RouteredMenu = withRouter(LinkMenu);
const MenuWithAuth = (props) => (
            <AuthUserContext.Consumer>
                {value => (
                    <RouteredMenu {...props} authContext={value}  />
                )}
            </AuthUserContext.Consumer>

);

export default withRouter(MenuWithAuth);
