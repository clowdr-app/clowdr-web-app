import * as React from "react";
import {AuthUserContext} from "../Session";
import {Collapse, Divider, Menu, Popconfirm, Select, Skeleton, Tooltip, Typography} from "antd";
import {withRouter} from "react-router-dom";
import {LockTwoTone} from "@ant-design/icons"
import NewRoomForm from "./NewRoomForm";
import UserStatusDisplay from "./UserStatusDisplay";
import Parse from "parse";
import PresenceForm from "./PresenceForm";
import CollapsedChatDisplay from "../Chat/CollapsedChatDisplay";
import UpcomingProgram from "./UpcomingProgram";


class ContextualActiveUsers extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: this.props.auth.videoRoomsLoaded, currentRoom: this.props.auth.currentRoom,
            collapsed: this.props.collapsed,
            activePrivateVideoRooms: this.props.auth.activePrivateVideoRooms,
            activePublicVideoRooms: this.props.auth.activePublicVideoRooms,
            currentSocialSpaceMembers: [],
            user: this.props.auth.user,
            activeSpace: this.props.auth.activeSpace,
            filterRoom: null,
            unread: {},
            expandedProgramRoom: this.props.auth.expandedProgramRoom
        };
        this.props.auth.leftSidebar = this;
    }


    setExpandedProgramRoom(programRoom){
        this.setState({programRoom: programRoom});

    }


    async componentDidMount() {
        let user = this.props.auth.user;
        if (user) {
            this.props.auth.helpers.getPresences(this);
            this.setState({loggedIn: true});
            this.props.auth.chatClient.initJoinedChatList(this);
        } else {
            this.setState({loggedIn: false});
        }

    }

    areEqualID(o1, o2) {
        if (!o1 && !o2)
            return true;
        if (!o1 || !o2)
            return false;
        return o1.id == o2.id;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        let stateUpdate = {};
        if(this.props.auth.activeSpace != this.state.activeSpace){
            stateUpdate.activeSpace = this.props.auth.activeSpace;
        }
        if (!this.areEqualID(this.props.auth.currentConference, prevProps.auth.currentConference) || !this.areEqualID(prevProps.auth.user, this.props.auth.user)) {
            if (this.props.auth.user) {
                stateUpdate.loggedIn = true;
            }
        }
        if (this.props.auth.videoRoomsLoaded != this.state.loading) {
            stateUpdate.loading = this.props.auth.videoRoomsLoaded;
        }
        if (this.props.auth.activePrivateVideoRooms != this.state.activePrivateVideoRooms) {
            stateUpdate.activePrivateVideoRooms = this.props.auth.activePrivateVideoRooms;
        }
        if (this.props.auth.activePublicVideoRooms != this.state.activePublicVideoRooms) {
            stateUpdate.activePublicVideoRooms = this.props.auth.activePublicVideoRooms;
        }
        if (!this.areEqualID(this.state.currentRoom, this.props.auth.currentRoom)) {
            stateUpdate.currentRoom = this.props.auth.currentRoom;
        }
        if (this.props.collapsed != this.state.collapsed) {
            stateUpdate.collapsed = this.props.collapsed;
        }
        if (Object.keys(stateUpdate).length > 0) {
            this.setState(stateUpdate);
        }
        this.mounted = true;
    }

    componentWillUnmount() {
        this.props.auth.helpers.cancelPresenceSubscription(this);

        this.mounted = false;
    }

    removeChannel(sid) {
        this.setState(
            (prevState) => ({
                chats: prevState.chats.filter(c => c != sid)
            })
        )
    }

    addChannel(sid) {
        this.setState((prevState) => ({
            chats: [sid, ...prevState.chats.filter(c => c != sid)]
        }))
    }

    joinCall(room) {
        if(room.get("programItem")){
            this.props.history.push("/program/"+room.get("programItem").get("confKey"))
        }
        else{
            this.props.history.push("/video/" + this.props.auth.currentConference.get('conferenceName') + "/" + room.get("title"));
            this.props.auth.setActiveRoom(room.get("title"));
        }
    }

    setUnreadCount(sid, count) {
        this.setState(
            (prevState) => ({
                unread: {
                    ...prevState.unread,
                    [sid]: count
                }
            })
        )
    }
    filterList(value) {
        let roomID = value;
        let userID = null;
        if(value && value.includes("@")){
            roomID = value.substring(value.indexOf("@")+1);
            userID = value.substring(0, value.indexOf("@"));
        }
        this.setState({filteredRoom: roomID, filteredUser: userID});
    }


    render() {
        if (!this.state.loggedIn) {
            return <div></div>
        }

        const compareNames = (a, b) => {
            a = a.get("displayName");
            b = b.get("displayName");
            if(!a)
                return -1;
            if(!b) return 1;
            return (a.localeCompare(b))
        };

        let topHeight = 0;
        let topElement = document.getElementById("top-content");
        if (topElement)
            topHeight = topElement.clientHeight;

        let tabs = "";
        let liveMembers = 0   // BCP: Seems not to be used??
        let allActiveRooms = [];
        if(!this.state.activePrivateVideoRooms)
            allActiveRooms = this.state.activePublicVideoRooms;
        else if(!this.state.activePublicVideoRooms){
            allActiveRooms = this.state.activePrivateVideoRooms;
        } else {
            allActiveRooms = this.state.activePrivateVideoRooms.concat(this.state.activePublicVideoRooms);
        }

        let programRooms = allActiveRooms.filter(r => r.get("programItem") && (!r.get("socialSpace") || r.get("socialSpace").id == this.state.activeSpace.id));
        allActiveRooms = allActiveRooms.filter(r => !r.get("programItem") && (!r.get("socialSpace") || r.get("socialSpace").id == this.state.activeSpace.id))
        //Also make a fake rom for the lobby.
        let BreakoutRoom = Parse.Object.extend("BreakoutRoom");


        if(this.state.filteredRoom)
            allActiveRooms = allActiveRooms.filter(r=>r.id == this.state.filteredRoom);
        let searchOptions = [];


        let lobbyMembers = [];
        if (this.state.presences && this.state.activeSpace)
            lobbyMembers = Object.values(this.state.presences)
                .filter(p =>
                    p
                    && p.get("socialSpace")
                    && p.get("socialSpace").id == this.state.activeSpace.id
                    && (!this.state.filteredUser || this.state.filteredUser == p.get("user").id)
                ).map(p => p.get("user")).sort(compareNames);
        let latestLobbyMembers = lobbyMembers.concat().sort((i1, i2) => {
            return (i1 && i2 && i1.get("updatedAt") > i2.get("updatedAt") ? 1 : -1)
        }).slice(0,10);
        for(let u of lobbyMembers){
            searchOptions.push({label: "@"+u.get("displayName"), value: u.id+"@-lobby"});
        }

        for (let room of allActiveRooms) {
            searchOptions.push({label: "#" + room.get("title"), value: room.id});
            if (room && room.get("members")) {
                searchOptions = searchOptions.concat(room.get("members").map(u => {
                    if(u)
                        return {label: "@" + u.get("displayName"), value: u.id + "@" + room.id}
                    else
                        return {label: "@???", value: "??"}
                }));
                liveMembers += room.get("members").length;
            }
        }

        if (!this.state.collapsed) {

            let programRoomSpecificContent;
            if(this.state.programRoom && this.state.programRoom.get("qa")){
                const q_url = this.state.programRoom.get("qa");
                programRoomSpecificContent = <div>

                <Divider>Questions for Speaker</Divider>
                <iframe className="slido" title={this.state.programRoom.get("name")} src={q_url} allowFullScreen/>
                </div>

            }
            let selectedKeys = [];
            if(this.props.auth.currentRoom)
                selectedKeys.push(this.props.auth.currentRoom.id);
            if(this.state.filteredRoom)
                selectedKeys.push(this.state.filteredRoom);
            if(this.state.filteredUser)
                selectedKeys.push(this.state.filteredUser);

            let activeSpace = this.props.auth.activeSpace ? this.props.auth.activeSpace.get("name") : "Nowhere";
            let programInfo = <UpcomingProgram />
            tabs = <div>
                <div>
                    <div style={{height:'6px', background:'white'}}/>

                    <Select style={{width: "100%"}} showSearch
                            allowClear={true}
                            onChange={this.filterList.bind(this)}
                            filterOption={(input, option) =>{
                                if(!option.label)
                                    return false;
                                if(!input)
                                    return false;
                                return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }}

                            options={searchOptions} placeholder="Search for people and rooms"></Select>

                    <div style={{height:'6px', background:'white'}}/>

                    <div><PresenceForm /></div>

                    <div style={{height:'6px', background:'white'}}/>

                    <Divider className="social-sidebar-divider">
                        <Tooltip mouseEnterDelay={0.5} title="Social features in CLOWDR are organized around different 'rooms' that represent different aspects of the conference. The list below shows who else is in this room, right now.">{activeSpace}</Tooltip>
                    </Divider>

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

                              selectedKeys={selectedKeys}
                              defaultOpenKeys={['firstUsers']}
                              forceSubMenuRender={true}
                              expandIcon={null}
                        >
                            <Menu.SubMenu key="firstUsers" expandIcon={<span></span>}>

                            {latestLobbyMembers.map((user) => {
                                let className = "personHoverable";
                                if (this.state.filteredUser == user.id)
                                    className += " personFiltered"
                                return <Menu.Item key={"latest"+user.id} className={className}>
                                    <UserStatusDisplay popover={true} profileID={user.id}/>
                                </Menu.Item>
                            })
                            }
                            </Menu.SubMenu>{
                            <Menu.SubMenu key="restUsers"
                                          title={<div className="overflowHelper">{lobbyMembers.length} total</div>}>

                                {lobbyMembers.map((user) => {
                                    let className = "personHoverable";
                                    if (this.state.filteredUser == user.id)
                                        className += " personFiltered"
                                    return <Menu.Item key={user.id} className={className}>
                                        <UserStatusDisplay popover={true} profileID={user.id}/>
                                    </Menu.Item>
                                })
                                }
                            </Menu.SubMenu>
                        }
                        </Menu>

                </div>

                {programRoomSpecificContent}

                {programInfo}

                <Divider className="social-sidebar-divider"><Tooltip mouseEnterDelay={0.5} title={"These rooms feature video and chat, and are associated with the room that you are currently in - "
                + activeSpace}>Video chat rooms</Tooltip></Divider>

                <Menu mode="inline"
                      className="activeRoomsList"
                    style={{
                        border: '1px solid #FAFAFA'
                    }}
                      inlineIndent={0}

                      forceSubMenuRender={true}
                      openKeys={allActiveRooms.map(r=>r.id)}
                      expandIcon={null}
                      selectedKeys={selectedKeys}
                >
                {allActiveRooms ? allActiveRooms.sort((i1, i2) => {
                    return (i1 && i2 && i1.get("updatedAt") < i2.get("updatedAt") ? 1 : -1)
                }).map((item) => {
                    if(!item){
                        return <Skeleton />
                    }

                    let membersCount = 0;
                    if (item.get("members")) {
                        membersCount = item.get("members").length;
                    }
                    let tag, joinInfo;
                    if(item.get("mode") == "group"){
                    //     tag = <Tag  style={{width:"43px", textAlign: "center"}}>Big</Tag>
                        joinInfo = "Click to join this big group room (up to 50 callers). Up to 5 speakers are allowed at once."
                    }
                    else if(item.get("mode") == "peer-to-peer"){
                    //     tag = <Tag style={{width:"43px", textAlign: "center"}}>P2P</Tag>
                        joinInfo ="Click to join this peer-to-peer room (up to 10 callers)."
                    }
                    else if(item.get("mode") == "group-small"){
                    //     tag = <Tag style={{width:"43px", textAlign: "center"}}>Small</Tag>
                        joinInfo = "Click to join this small group room (up to 4 callers)."
                    }

                    let isModOverride = false;
                    if(item.get("isPrivate")){
                        //check for our uid in the acl
                        let acl = item.getACL();
                        if(!acl.getReadAccess(this.props.auth.user.id))
                            isModOverride = true;
                    }
                    let privateSymbol = <></>
                    if (item.get("isPrivate")) {
                        if (isModOverride)
                            privateSymbol = <LockTwoTone style={{verticalAlign: 'middle'}} twoToneColor="#eb2f96"/>
                        else privateSymbol = <LockTwoTone style={{verticalAlign: 'middle'}}/>
                    }
                    let formattedRoom =
                        <div className="activeBreakoutRoom" style={{paddingLeft: "3px"}}>{tag}{privateSymbol}{item.get('title')}</div>
                    let joinLink = "";
                        if (!this.state.currentRoom || this.state.currentRoom.id != item.id)
                        {
                            if (item.get("members") && item.get("capacity") <= item.get("members").length)
                                joinLink = <div><Tooltip mouseEnterDelay={0.5} title={"This room is currently full (capacity is "+item.get('capacity')+")"}><Typography.Text
                                    disabled>{formattedRoom}</Typography.Text></Tooltip></div>
                            else if(isModOverride){
                                joinLink = <div><Tooltip mouseEnterDelay={0.5} title={joinInfo}>
                                    <Popconfirm title={<span style={{width: "250px"}}>You do not have permission to join this room, but can override<br />
                                        this as a moderator. Please only join this room if you were asked<br /> by a participant
                                        to do so.<br /> Otherwise, you are interrupting a private conversation.</span>}
                                                onConfirm={this.joinCall.bind(this,item)}
                                        >
                                    <a href="#"
                                    >{formattedRoom}</a>
                                    </Popconfirm>
                                    </Tooltip>
                                </div>;
                            }
                            else {
                                if (!item.get("members") || item.get("members").length === 0) {
                                    joinInfo = joinInfo + " (Currently Empty!)"
                                }
                                joinLink = <div><Tooltip mouseEnterDelay={0.5} title={joinInfo}><a href="#"
                                                                                                   onClick={this.joinCall.bind(this, item)}>{formattedRoom}</a></Tooltip>
                                </div>;
                            }
                        }
                        else {
                            joinLink = formattedRoom;
                        }
                    let list;
                    let header = joinLink;
                        if (item.get("members") && item.get("members").length > 0)
                            list = item.get("members").map(user=>{
                                if(user) {
                                    let className = "personHoverable";
                                    if (this.state.filteredUser == user.id)
                                        className += " personFiltered"
                                    return <Menu.Item key={user.id} className={className}>
                                        <UserStatusDisplay popover={true} profileID={user.id}/>
                                    </Menu.Item>
                                }
                            }) //}>
                        else
                            list = <></>
                        return (
                            // <Menu.Item key={item.id}>
                            //     {header}
                                <Menu.SubMenu key={item.id} popupClassName="activeBreakoutRoom" title={header} expandIcon={<span></span>}>

                                    {list}
                                </Menu.SubMenu>
                            // </Menu.Item>
                        )
                    }
                )
                : <Collapse.Panel showArrow={false} header={<Skeleton/>}></Collapse.Panel>}
                </Menu>
                <div style={{textAlign: 'center'}}>
                    <NewRoomForm type="secondary" text="New video chat room" />
                </div>
            </div>
        }
        return (


                        <div
                            // style={{backgroundColor: '#f0f2f5'}}>
                            >
                            {tabs}
                        </div>

        );
    }



}

const AuthConsumer = (props) => (
    // <Router.Consumer>
    //     {router => (
            <AuthUserContext.Consumer>
                {value => (
                    <ContextualActiveUsers {...props} auth={value}/>
                )}
            </AuthUserContext.Consumer>
    // )}</Router.Consumer>

);

export default withRouter(AuthConsumer)
