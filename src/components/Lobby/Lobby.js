import React from 'react';
import {Avatar, Card, Divider, Layout, List, message, Popconfirm, Space, Spin, Tooltip, Typography} from "antd";
import {AuthUserContext} from "../Session";
import NewRoomForm from "./NewRoomForm";
import withLoginRequired from "../Session/withLoginRequired";

const { Content, Footer, Sider} = Layout;

// const {TabPane} = Tabs;
// const IconText = ({icon, text}) => (
//     <Space>
//         {React.createElement(icon)}
//         {text}
//     </Space>
// );


class MeetingSummary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {loadingMeeting: false, loading: false, members: this.props.item.members, profiles: {},
            videoRoomsLoaded: this.props.auth.videoRoomsLoaded};
    }

    componentDidMount() {
        // let ref = this.props.firebase.db.ref("users");
        // if (this.props.item && this.props.item.members)
        //     Object.keys(this.props.item.members).forEach((key) => {
        //         ref.child(key).once("value").then((v) => {
        //             this.setState((prevState) => {
        //                 let members = Object.assign({}, prevState.members);
        //                 members[key] = v.val();
        //                 return {members};
        //             })
        //         })
        //     })
    }

    differentMembers(a, b) {
        if (a && b)
            for (let i = 0; i < a.length && i < b.length; i++) {
                if (a[i] !== b[i])
                    return true;
                if (a[i] && b[i] && a[i].id !== b[i].id)
                    return true;
                if(a[i].get("displayName") !== b[i].get("displayName") || a[i].get("profilePhoto") !== b[i].get("profilePhoto"))
                    return true;
            }
        return false;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.item.get('members') !== prevProps.item.get('members') || this.differentMembers(this.props.item.get("members"), prevProps.item.get("members"))) {
            this.setState({members: this.props.item.members});
        }
    }

    joinMeeting(meeting) {
        if (meeting.get("twilioID") && meeting.get('twilioID').startsWith("demo")) {
            message.error('Sorry, you can not join the demo meetings. Try to create a new one!');

        } else {
            console.log(meeting.get("conference"))
            this.props.history.push("/video/" + encodeURI(meeting.get("conference").get("conferenceName"))+ '/'+encodeURI(meeting.get("title")));
        }
    }

    render() {
        let item = this.props.item;
        let _this = this;
        return <Card title={item.get('title')} style={{width: "350px", "height": "350px", overflow: "scroll"}}
                     size={"small"}
                     extra={(item.get("members") && item.get("capacity") <= item.get("members").length ? <Tooltip title={"This room is currently full (capacity is "+item.get('capacity')+")"}><Typography.Text disabled>Join</Typography.Text></Tooltip> : <Popconfirm
                         title="You are about to join a video call. Are you ready?"
                         onConfirm={_this.joinMeeting.bind(_this, item)}
                         okText="Yes"
                         cancelText="No"
                     ><a href="#">Join</a></Popconfirm>)}
        >
            {(item.get('members') ? <span>
                {/*<h4>Currently here:</h4>*/}
                {/*<Divider orientation="left">Here now:</Divider>*/}
                <List
                    dataSource={item.get('members').filter((v)=>(v != null ))}
                    size={"small"}
                    renderItem={user => {
                        let avatar;
                        if (user.get("profilePhoto"))
                            avatar = <Avatar src={user.get("profilePhoto").url()}/>
                        else {
                            let initials = "";
                            if(user.get("displayName"))
                                user.get("displayName").split(" ").forEach((v=>initials+=v.substring(0,1)))

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
                    }}
                >
                    {this.state.loading && this.state.hasMore && (
                        <div className="demo-loading-container">
                            <Spin/>
                        </div>
                    )}
                </List>
            </span> : <span>Nobody's here yet</span>)}

        </Card>

    }
}

class Lobby extends React.Component {
    constructor(props) {
        super(props);
        let newName = "";
        let showModal = false;
        if(this.props.match && this.props.match.params && this.props.match.params.roomName){
            newName = this.props.match.params.roomName;
            showModal =true;
        }

        this.state = {videoRoomsLoaded: this.props.auth.videoRoomsLoaded, 'visible': showModal, requestedName: newName, maxDisplayedRooms: 10,
            activePrivateVideoRooms: this.props.auth.activePrivateVideoRooms,
            activePublicVideoRooms: this.props.auth.activePublicVideoRooms
        };
    }

    async componentDidMount() {
        let user = await this.props.auth.refreshUser();
        this.mounted = true;
        if (user) {
            await this.props.auth.subscribeToVideoRoomState();
            this.setState({loggedIn: true});
        } else {
            this.setState({loggedIn: false});
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    areEqualID(o1, o2) {
        if (!o1 && !o2)
            return true;
        if (!o1 || !o2)
            return false;
        return o1.id == o2.id;
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.auth.videoRoomsLoaded != this.state.videoRoomsLoaded) {
            this.setState({videoRoomsLoaded: this.props.auth.videoRoomsLoaded});
        }
        if (!this.areEqualID(this.props.auth.currentConference, prevProps.auth.currentConference) || !this.areEqualID(prevProps.auth.user, this.props.auth.user)) {
            if (this.props.auth.user) {
                this.props.auth.subscribeToVideoRoomState();

                this.setState({loggedIn: true});
            }
        }
        if(this.props.auth.activePrivateVideoRooms != this.state.activePrivateVideoRooms)
        {
            this.setState({activePrivateVideoRooms: this.props.auth.activePrivateVideoRooms})
        }
        if(this.props.auth.activePublicVideoRooms != this.state.activePublicVideoRooms){
            this.setState({activePublicVideoRooms: this.props.auth.activePublicVideoRooms})
        }
        if (!this.areEqualID(this.state.currentRoom, this.props.auth.currentRoom)) {
            this.setState({currentRoom: this.props.auth.currentRoom})
        }
        this.mounted = true;
    }

    async onCreate(values) {
        let user = this.props.auth.user;
        let idToken = user.getSessionToken();
        const data = await fetch(
            `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/new`

            // 'http://localhost:3001/video/token'
            , {
                method: 'POST',
                body: JSON.stringify({
                    room: values.title,
                    identity: idToken,
                    slackTeam: this.props.auth.currentConference.get("slackWorkspace"),
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        let res = await data.json();
        if(res.status === "error"){
            message.error(res.message);
        }
        else{
            this.props.history.push("/video/"+encodeURI(this.props.auth.currentConference.get("conferenceName"))+"/"+encodeURI(values.title));
        }
        // var _this = this;
        // let Room =Parse.Object.extend("BreakoutRoom");
        // let room = new Room();
        // room.set("title", values.title);
        // room.set("creator", this.props.auth.user);
        // // room.set("description", values.description);
        // // room.set("ephemeral",true);
        // room.set("conference", this.props.auth.currentConference);
        // room.save().then((val) => {
        //     _this.props.history.push("/video/" + room.id);
        // }).catch(err => {
        //     console.log(err);
        // });
    }


    displayMore() {
        this.setState((prevState) => ({
            maxDisplayedRooms: prevState.maxDisplayedRooms + 10
        }));
    }

    hasMoreRoomsToShow() {
        return this.state.maxDisplayedRooms < this.state.rooms.length;
    }

    render() {
        if (this.state.loading) {
            return (
                <Spin tip="Loading...">
                </Spin>)
        }
        let allActiveRooms;
        if(!this.state.activePrivateVideoRooms)
            allActiveRooms = this.state.activePublicVideoRooms;
        else if(!this.state.activePublicVideoRooms){
            allActiveRooms = this.state.activePrivateVideoRooms;
        }
        else{
            allActiveRooms = this.state.activePrivateVideoRooms.concat(this.state.activePublicVideoRooms);
        }

        return (
            // <Tabs defaultActiveKey="1">
            //     <TabPane tab="Breakout Areas" key="1">
            <div>
                <Typography.Title level={2}>Lobby Session</Typography.Title>

                <Typography.Paragraph>
                Some say that the most valuable part of an academic conference is the "lobby track" - where
                colleagues meet, catch up, and share
                casual conversation. To bring the metaphor into the digital world, the digital lobby session
                allows you to create a small group video chat, and switch between group chats. Take
                a look at the breakout rooms that participants have formed so far and join one, or create a new
                one!
                </Typography.Paragraph>
                <NewRoomForm style={{float: "right", paddingTop: "5px"}} initialName={this.state.requestedName} visible={this.state.visible} />

                <Space />
                <Divider/>
                    <div style={{maxHeight: "80vh", overflow: 'auto', border: '1px sold #FAFAFA'}}>
                        {/*<InfiniteScroll*/}
                        {/*    pageStart={0}*/}
                        {/*    // hasMore={Object.keys(this.state.activeUsers).length >= 20}*/}
                        {/*    hasMore={this.hasMoreRoomsToShow()}*/}
                        {/*    loadMore={this.displayMore.bind(this)}*/}
                        {/*    useWindow={false}*/}
                        {/*    initialLoad={false}*/}
                        {/*    loader={<Spin>Loading...</Spin>}*/}
                        {/*>*/}
                            <Space style={{
                                maxWidth: '80vw',
                                display: "flex",
                                marginLeft: "20px",
                                flexWrap: "wrap"
                            }}>
                                {
                                    Object.values(allActiveRooms)//.slice(0, this.state.maxDisplayedRooms)
                                        .map((item) => (
                                        <MeetingSummary history={this.props.history} key={item.id} item={item} parseLive={this.props.parseLive} auth={this.props.auth} />
                                    ))}
                            </Space>
                        {/*</InfiniteScroll>*/}
                    </div>
                </div>
        );
    }
}

const AuthConsumer = (props) => (
            <AuthUserContext.Consumer>
                {value => (
                    <Lobby {...props} auth={value} parseLive={value.parseLive}/>
                )}
            </AuthUserContext.Consumer>
);
export default withLoginRequired(AuthConsumer);