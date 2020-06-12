import React, {Component} from "react";
import {AuthUserContext} from "../Session";
import {Collapse, Divider, Menu, Popover, Select, Skeleton, Tooltip, Typography} from "antd";
import {withRouter} from "react-router-dom";
import {LockTwoTone} from "@ant-design/icons"
import NewRoomForm from "./NewRoomForm";


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
        if (!this.areEqualID(this.props.auth.currentConference, prevProps.auth.currentConference) || !this.areEqualID(prevProps.auth.user, this.props.auth.user)) {
            if (this.props.auth.user) {
                this.setState({loggedIn: true});
                this.props.auth.subscribeToVideoRoomState();
            }
        }
        //Check for new notifications
        if(this.props.auth.userProfile.get("watchedRooms")){
            for(let room of this.props.auth.activePublicVideoRooms){
                //Check against prev
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
        let allActiveRooms;
        if(!this.state.activePrivateVideoRooms)
            allActiveRooms = this.state.activePublicVideoRooms;
        else if(!this.state.activePublicVideoRooms){
            allActiveRooms = this.state.activePrivateVideoRooms;
        }
        else{
            allActiveRooms = this.state.activePrivateVideoRooms.concat(this.state.activePublicVideoRooms);
        }
        if(this.state.filteredRoom)
            allActiveRooms = allActiveRooms.filter(r=>r.id == this.state.filteredRoom);
        let searchOptions = [];

        if (allActiveRooms)
            for (let room of allActiveRooms) {
                searchOptions.push({label: "#"+room.get("title"), value: room.id});
                if (room && room.get("members")) {
                    searchOptions = searchOptions.concat(room.get("members").map(u => {
                        return {label: "@"+u.get("displayName"), value: u.id+"@"+room.id}
                    }));
                    liveMembers += room.get("members").length;
                }
            }
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
                    <Divider>
                        Available Rooms
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
                    style={{height: "100%"}}
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
                    return (i1 && i2 && i1.get("updatedAt") < i2.get("updatedAt") ? 1 : -1)
                }).map((item) => {
                    if(!item){
                        return <Skeleton />
                    }

                    let membersCount = 0;
                    if (item.get("members")) {
                        membersCount = item.get("members").length;
                    }
                    let formattedRoom =
                        <div className="activeBreakoutRoom" style={{paddingLeft: "3px"}}>{item.get("isPrivate") ? <LockTwoTone style={{verticalAlign: 'middle'}} /> : <></>}{item.get('title')}</div>

                    let joinLink = "";
                        if (!this.state.currentRoom || this.state.currentRoom.id != item.id)
                        {
                            if (item.get("members") && item.get("capacity") <= item.get("members").length)
                                joinLink = <div><Tooltip title={"This room is currently full (capacity is "+item.get('capacity')+")"}><Typography.Text
                                    disabled>{formattedRoom}</Typography.Text></Tooltip></div>
                            else
                                joinLink = <div><Tooltip title="Join this video room"><a href="#"
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
                                             let popoverContent=<a href={"slack://user?team="+this.props.auth.currentConference.get("slackWorkspace")+"&id="+user.get("slackID")}>Direct message on Slack</a>;
                                let className = "personHoverable";
                                if(this.state.filteredUser == user.id)
                                    className += " personFiltered"
                                             return <Menu.Item key={user.id} className={className}>
                                                 <Popover placement="topRight"  content={popoverContent}>{user.get("displayName")}</Popover>
                                                 {/*{user.get("displayName")}*/}
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
