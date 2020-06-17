import React, {Component} from "react";
import {AuthUserContext} from "../Session";
import {Collapse, Divider, Menu, Popconfirm, Select, Skeleton, Tag, Tooltip, Typography} from "antd";
import {withRouter} from "react-router-dom";
import {LockTwoTone} from "@ant-design/icons"
import NewRoomForm from "./NewRoomForm";
import UserStatusDisplay from "./UserStatusDisplay";
import Parse from "parse";
import PresenceForm from "./PresenceForm";


class ContextualActiveUsers extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loading: this.props.auth.videoRoomsLoaded, currentRoom: this.props.auth.currentRoom,
            collapsed: this.props.collapsed,
            activePrivateVideoRooms: this.props.auth.activePrivateVideoRooms,
            activePublicVideoRooms: this.props.auth.activePublicVideoRooms,
            user: this.props.auth.user,
            filterRoom: null
        };
    }

    async componentDidMount() {
        let user = this.props.auth.user;
        if (user) {
            this.setState({presences: this.props.auth.presences});
            await this.props.auth.subscribeToVideoRoomState();
            this.setState({loggedIn: true});
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
        if(this.props.auth.presences != this.state.presences){
            this.setState({presences: this.props.auth.presences});
        }
        if (!this.areEqualID(this.props.auth.currentConference, prevProps.auth.currentConference) || !this.areEqualID(prevProps.auth.user, this.props.auth.user)) {
            if (this.props.auth.user) {
                this.setState({loggedIn: true});
                this.props.auth.subscribeToVideoRoomState();
            }
        }
        if (this.props.auth.videoRoomsLoaded != this.state.loading) {
            this.setState({loading: this.props.auth.videoRoomsLoaded});
        }
        if (this.props.auth.activePrivateVideoRooms != this.state.activePrivateVideoRooms)
        {
            this.setState({activePrivateVideoRooms: this.props.auth.activePrivateVideoRooms})
        }
        if(this.props.auth.activePublicVideoRooms != this.state.activePublicVideoRooms){
            this.setState({activePublicVideoRooms: this.props.auth.activePublicVideoRooms})
        }
        if (!this.areEqualID(this.state.currentRoom, this.props.auth.currentRoom)) {
            this.setState({currentRoom: this.props.auth.currentRoom})
        }
        if(this.props.collapsed != this.state.collapsed){
            this.setState({collapsed: this.props.collapsed})
        }
        this.mounted = true;
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    joinCall(room) {
        console.log(this.props)
        this.props.history.push("/video/" + this.props.auth.currentConference.get('conferenceName') + "/" + room.get("title"));
        this.props.auth.setActiveRoom(room.get("title"));
    }


    filterList(value) {
        let roomID = value;
        console.log(value)
        let userID = null;
        if(value && value.includes("@")){
            roomID = value.substring(value.indexOf("@")+1);
            userID = value.substring(0, value.indexOf("@"));
            console.log(userID);
        }
        this.setState({filteredRoom: roomID, filteredUser: userID});
    }
    render() {
        if (!this.state.loggedIn) {
            return <div></div>
        }
        let topHeight = 0;
        let topElement = document.getElementById("top-content");
        if (topElement)
            topHeight = topElement.clientHeight;

        let tabs = "";
        let liveMembers = 0
        let allActiveRooms = [];
        if(!this.state.activePrivateVideoRooms)
            allActiveRooms = this.state.activePublicVideoRooms;
        else if(!this.state.activePublicVideoRooms){
            allActiveRooms = this.state.activePrivateVideoRooms;
        }
        else{
            allActiveRooms = this.state.activePrivateVideoRooms.concat(this.state.activePublicVideoRooms);
        }
        //Also make a fake rom for the lobby.
        let BreakoutRoom = Parse.Object.extend("BreakoutRoom");


        if(this.state.filteredRoom)
            allActiveRooms = allActiveRooms.filter(r=>r.id == this.state.filteredRoom);
        let searchOptions = [];

        let usersToFilter = [];
        for (let room of allActiveRooms) {
            if (room && room.get("members")) {
                usersToFilter = usersToFilter.concat(room.get("members").filter(u=>u).map(u => u.id));
            }
        }
        let lobbyRoom = new BreakoutRoom();
        lobbyRoom.set("title", "Lobby")
        lobbyRoom.id = "lobby";
        let lobbyMembers = [];
        if (this.state.presences)
            lobbyMembers = Object.values(this.state.presences).filter(p => p).map(p => p.get("user")).filter(u=>!usersToFilter.includes(u.id));

        for (let room of allActiveRooms) {
            searchOptions.push({label: "#" + room.get("title"), value: room.id});
            if (room && room.get("members")) {
                searchOptions = searchOptions.concat(room.get("members").map(u => {
                    return {label: "@" + u.get("displayName"), value: u.id + "@" + room.id}
                }));
                liveMembers += room.get("members").length;
            }
        }

        lobbyRoom.set("members", lobbyMembers);
        allActiveRooms.push(lobbyRoom);
        if (!this.state.collapsed) {
            let selectedKeys = [];
            if(this.props.auth.currentRoom)
                selectedKeys.push(this.props.auth.currentRoom.id);
            if(this.state.filteredRoom)
                selectedKeys.push(this.state.filteredRoom);
            if(this.state.filteredUser)
                selectedKeys.push(this.state.filteredUser);
            tabs = <div>
                <div>

                    <div><PresenceForm /></div>
                    <Divider>
                        Available Rooms and Users
                    </Divider>
                    <div style={{textAlign: 'center'}}>
                        <NewRoomForm type="secondary" text="Create New Room" />
                    </div>
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

                            options={searchOptions} placeholder="Search"></Select>
                </div>
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
                      forceSubMenuRender={true}
                      openKeys={allActiveRooms.map(r=>r.id)}
                      expandIcon={null}
                      selectedKeys={selectedKeys}
                >

                             {/*defaultActiveKey={this.props.auth.currentRoom ? [this.props.auth.currentRoom.id] : []}*/}
                             {/*style={{backgroundColor: "#f8f8f8"}}>*/}
                {/*<List*/}
                {/*    dataSource={this.state.activeRooms}*/}
                {/*renderItem={item => {*/}
                {allActiveRooms ? allActiveRooms.sort((i1, i2) => {
                    if(i1 == lobbyRoom)
                        return 1;
                    else if(i2 == lobbyRoom)
                        return -1;
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
                        tag = <Tag  style={{width:"43px", textAlign: "center"}}>Big</Tag>
                        joinInfo = "Join this big group room, '"+item.get("title")+"'. Big group rooms support up to 50 callers, but you can only see the video of up to 4 other callers at once."
                    }
                    else if(item.get("mode") == "peer-to-peer"){
                        tag = <Tag style={{width:"43px", textAlign: "center"}}>P2P</Tag>
                        joinInfo ="Join this peer-to-peer room, '"+item.get("title")+"'. Peer-to-peer rooms support up to 10 callers at once, but quality may not be as good as small or big group rooms"
                    }
                    else if(item.get("mode") == "group-small"){
                        tag = <Tag style={{width:"43px", textAlign: "center"}}>Small</Tag>
                        joinInfo = "Join this small group room, '"+item.get("title")+"'. Small group rooms support only up to 4 callers, but provide the best quality experience."
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
                                joinLink = <div><Tooltip title={"This room is currently full (capacity is "+item.get('capacity')+")"}><Typography.Text
                                    disabled>{formattedRoom}</Typography.Text></Tooltip></div>
                            else if(isModOverride){
                                joinLink = <div><Tooltip title={joinInfo}>
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
                            else
                                joinLink = <div><Tooltip title={joinInfo}><a href="#"
                                                                                         onClick={this.joinCall.bind(this, item)}>{formattedRoom}</a></Tooltip>
                                </div>;
                                // joinLink=  <Popconfirm
                                //     title="You are about to join a video call. Are you ready?"
                                //     onConfirm={this.joinCall.bind(this, item)}
                                //     okText="Yes"
                                //     cancelText="No"
                                // ><a href="#">{formattedRoom}</a></Popconfirm>
                        }
                        else {
                            joinLink = formattedRoom;
                        }
                    if (item == lobbyRoom) {
                        joinLink = <div className="activeBreakoutRoom" style={{paddingLeft: "3px"}}><a href="#"
                                                                                                       onClick={() => this.props.history.push("/lobby")}>General
                            Lobby</a></div>
                    }
                    let list;
                    // let header = <div style={{clear: 'both', paddingLeft: '5px'}}>
                    //
                    //     {joinLink}
                    //     <div style={{float: 'right', paddingRight: '10px'}}>
                    //         <Badge
                    //             title={membersCount + " user"+(membersCount == 1 ? " is" : "s are")+" in this video chat"}
                    //             showZero={true}
                    //             style={{
                    //                 backgroundColor: (membersCount == 0 ? '#999' : '#52c41a'),
                    //             }}
                    //             offset={[6, -5]}
                    //             count={membersCount}/>
                    //     </div>
                    // </div>
                    let header = joinLink;
                        if (item.get("members") && item.get("members").length > 0)
                            // list = <List dataSource={} size={"small"}
                            //              className="activeRoomsList"
                            //              renderItem={user => {
                            list = item.get("members").map(user=>{
                                             // let avatar;
                                             // if (user.get("profilePhoto"))
                                             //     avatar = <Avatar src={user.get("profilePhoto").url()}/>
                                             // else {
                                             //     let initials = "";
                                             //     if(user.get("displayName"))
                                             //         user.get("displayName").split(" ").forEach((v => initials += v.substring(0, 1)))
                                             //     else
                                             //         initials = "ERR";
                                             //
                                             //     avatar = <Avatar>{initials}</Avatar>
                                             // }
                                let popoverContent = <a
                                    href={"slack://user?team=" + this.props.auth.currentConference.get("slackWorkspace") + "&id=" + user.get("slackID")}>Direct
                                    message on Slack</a>;
                                let className = "personHoverable";
                                if (this.state.filteredUser == user.id)
                                    className += " personFiltered"
                                return <Menu.Item key={user.id} className={className}>
                                    <UserStatusDisplay popover={true}profileID={user.id}/>
                                </Menu.Item>
                            }) //}>
                        else
                            list = <Menu.Item disabled={true}>Empty</Menu.Item>
                        return (
                            // <Menu.Item key={item.id}>
                            //     {header}
                                <Menu.SubMenu key={item.id} popupClassName="activeBreakoutRoom" title={header} expandIcon={<span></span>}>

                                    {list}
                                </Menu.SubMenu>
                            // </Menu.Item>
                        )
                    }
                ) : <Collapse.Panel showArrow={false} header={<Skeleton/>}></Collapse.Panel>}
                {/*{this.state.loading && this.state.hasMore && (*/}
                {/*    <div className="demo-loading-container">*/}
                {/*        <Spin/>*/}
                {/*    </div>*/}
                {/*)}*/}

                </Menu>
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
