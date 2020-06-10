import React, {Component} from "react";
import {AuthUserContext} from "../Session";
import {Avatar, Badge, Collapse, Divider, List, Skeleton, Tooltip, Typography} from "antd";
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
            user: this.props.auth.user
        };
    }

    async componentDidMount() {
        let user = await this.props.auth.refreshUser();
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



    render() {
        if (!this.state.loggedIn) {
            return <div></div>
        }
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
        if (allActiveRooms)
            for (let room of allActiveRooms) {
                if (room && room.get("members"))
                    liveMembers += room.get("members").length;
            }
        if (!this.state.collapsed) {
            tabs = <div>
                <div>
                    <Divider>
                        Available Rooms
                    </Divider>
                    <div style={{textAlign: 'center'}}>
                        <NewRoomForm type="secondary" text="New Room" />
                    </div>
                </div>
            <Collapse bordered={false}
                             defaultActiveKey={this.props.auth.currentRoom ? [this.props.auth.currentRoom.id] : []}
                             style={{backgroundColor: "#f8f8f8"}}>
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
                    let header = <div style={{clear: 'both'}}>

                        <div style={{float: 'left'}}>{item.get("isPrivate") ? <LockTwoTone style={{verticalAlign: 'middle'}} /> : <></>}{item.get('title')}</div>
                        <div style={{float: 'right', paddingRight: '10px'}}>


                        <Badge
                            title={membersCount + " user"+(membersCount == 1 ? " is" : "s are")+" in this video chat"}
                            showZero={true}
                            style={{
                                backgroundColor: (membersCount == 0 ? '#999' : '#52c41a'),
                            }}
                            offset={[6, -5]}
                            count={membersCount}/>
                        </div>
                    </div>
                    let joinLink = "";
                        if (!this.state.currentRoom || this.state.currentRoom.id != item.id)
                        {
                            if (item.get("members") && item.get("capacity") <= item.get("members").length)
                                joinLink = <div><Tooltip title={"This room is currently full (capacity is "+item.get('capacity')+")"}><Typography.Text
                                    disabled>Join this video room</Typography.Text></Tooltip></div>
                            else
                                joinLink = <div><a href="#"
                                                   onClick={this.joinCall.bind(this, item)}>Join this video room</a>
                                </div>;
                        }
                        let list;
                        if (item.get("members") && item.get("members").length > 0)
                            list = <List dataSource={item.get("members")} size={"small"}
                                         renderItem={user => {
                                             let avatar;
                                             if (user.get("profilePhoto"))
                                                 avatar = <Avatar src={user.get("profilePhoto").url()}/>
                                             else {
                                                 let initials = "";
                                                 if(user.get("displayName"))
                                                     user.get("displayName").split(" ").forEach((v => initials += v.substring(0, 1)))
                                                 else
                                                     initials = "ERR";

                                                 avatar = <Avatar>{initials}</Avatar>
                                             }
                                             return <List.Item key={user.id}>
                                                 <List.Item.Meta
                                                     avatar={
                                                         avatar
                                                     }
                                                     title={user.get("displayName")}
                                                 />
                                             </List.Item>
                                         }}/>
                        else
                            list = <span>This room is empty</span>
                        return (
                            <Collapse.Panel key={item.id} header={header} showArrow={false}
                                            className="chat-list-panel" style={{borderBottom: "none"}}>
                                {joinLink}
                                {list}
                            </Collapse.Panel>
                        )
                    }
                ) : <Collapse.Panel showArrow={false} header={<Skeleton/>}></Collapse.Panel>}
                {/*{this.state.loading && this.state.hasMore && (*/}
                {/*    <div className="demo-loading-container">*/}
                {/*        <Spin/>*/}
                {/*    </div>*/}
                {/*)}*/}
            </Collapse></div>
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
