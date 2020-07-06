import React from 'react';
import {Avatar, Card, Layout, List, message, Popconfirm, Space, Spin, Tooltip, Typography} from "antd";
import {AuthUserContext} from "../Session";
import withLoginRequired from "../Session/withLoginRequired";
import AboutModal from "../SignIn/AboutModal";
import UserStatusDisplay from "./UserStatusDisplay";
import NewRoomForm from "./NewRoomForm";

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
                     extra={(item.get("members") && item.get("capacity") <= item.get("members").length ? <Tooltip mouseEnterDelay={0.5} title={"This room is currently full (capacity is "+item.get('capacity')+")"}><Typography.Text disabled>Join</Typography.Text></Tooltip> : <Popconfirm
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
        let user = this.props.auth.user;
        this.mounted = true;
        if (user) {
            // this.props.auth.helpers.setGlobalState({chatChannel: "#general" });
            // const data = {spaceID:'TOCVe54R2j', confID: this.props.auth.currentConference.id};
            // Parse.Cloud.run("presence-addToPage", data);

            this.props.auth.setSocialSpace("Lobby");
            this.setState({presences: this.props.auth.presences});
            //subscribe to membership here too
            if (this.mounted){

                this.setState({loggedIn: true});
            }
        } else {
            this.setState({loggedIn: false});
        }
    }

    componentWillUnmount() {
        // const data = {spaceID:'TOCVe54R2j', confID: this.props.auth.currentConference.id};
        // Parse.Cloud.run("presence-removeFromPage", data);
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
        if(!this.mounted)
            return;
        if(this.props.auth.presences != this.state.presences){
            this.setState({presences: this.props.auth.presences});
        }
        // if (this.props.auth.videoRoomsLoaded != this.state.videoRoomsLoaded) {
        //     this.setState({videoRoomsLoaded: this.props.auth.videoRoomsLoaded});
        // }
        // if (!this.areEqualID(this.props.auth.currentConference, prevProps.auth.currentConference) || !this.areEqualID(prevProps.auth.user, this.props.auth.user)) {
        //     if (this.props.auth.user) {
        //         this.props.auth.subscribeToVideoRoomState();
        //
        //         this.setState({loggedIn: true});
        //     }
        // }
        // if(this.props.auth.activePrivateVideoRooms != this.state.activePrivateVideoRooms)
        // {
        //     this.setState({activePrivateVideoRooms: this.props.auth.activePrivateVideoRooms})
        // }
        // if(this.props.auth.activePublicVideoRooms != this.state.activePublicVideoRooms){
        //     this.setState({activePublicVideoRooms: this.props.auth.activePublicVideoRooms})
        // }
        // if (!this.areEqualID(this.state.currentRoom, this.props.auth.currentRoom)) {
        //     this.setState({currentRoom: this.props.auth.currentRoom})
        // }
        // this.mounted = true;
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


    // displayMore() {
    //     this.setState((prevState) => ({
    //         maxDisplayedRooms: prevState.maxDisplayedRooms + 10
    //     }));
    // }

    hasMoreRoomsToShow() {
        return this.state.maxDisplayedRooms < this.state.rooms.length;
    }

    render() {
        if (this.state.loading || !this.state.presences) {
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

        const compareDates = (i,j)=>{
            let a = this.state.presences[i];
            let b = this.state.presences[j];
            if(!a)
                return -1;
            if(!b) return 1;
            a = a.get("updatedAt");
            b = b.get("updatedAt");
            return (a < b ? 1 : a>b?-1: 0)
        };


        const compareNames = (i, j) => {
            let a = this.state.presences[i];
            let b = this.state.presences[j];
            if(!a)
                return -1;
            if(!b) return 1;
            a = a.get("user");
            b = b.get("user");
            if(!a)
                return -1;
            if(!b) return 1;
            a = a.get("displayName");
            b = b.get("displayName");
            if(!a)
                return -1;
            if(!b) return 1;
            return (a.localeCompare(b))
        };

        return (
            // <Tabs defaultActiveKey="1">
            //     <TabPane tab="Breakout Areas" key="1">
            <div>
                <AboutModal />
                <Typography.Title level={2}>Video Chat Lobby</Typography.Title>

                <Typography.Paragraph>
                Some say that the most valuable part of an academic conference is outside the official sessions, when
                colleagues meet, catch up, and share
                casual conversation. To bring the metaphor into the digital world, the CLOWDR platform
                allows you to create small group video chats and switch easily between  chats.
                    The pane on the left shows the active video chat rooms, and the list on this page shows the current status of all users on the platform.

                    <NewRoomForm style={{display: "none"}} initialName={this.state.requestedName} visible={this.state.visible} />
                </Typography.Paragraph>

                <Typography.Paragraph>
                When you are looking for casual conversation or hoping to meet new people,  head over to one of the small-group rooms labeled "Hallway 1", "Hallway 2", etc.  You can either join a room at random or else pick an empty room and wait for others to join you there.
                </Typography.Paragraph>

                <Typography.Paragraph>
                More information on the user interface, suggested social conventions, etc. can be found in the <a href="https://docs.google.com/document/d/1S-pNNqjA4RjQ8fn2i1Z2998VFn9bSwV4adOTpHw0BIo/edit#heading=h.dhd7xqg6t0qm" target="_blank">CLOWDR User Manual</a>.
                </Typography.Paragraph>
                <Space />

                <div className="new-breakout-room-button">
                    <NewRoomForm type="secondary" text="New Breakout Room" />
                </div>

                <div className="lobby-participant-list">
                {Object.keys(this.state.presences)
                     .sort((a,b)=>(compareNames(a, b)))
                     .map(item => <div key={item} className="lobby-participant-item"><UserStatusDisplay
                                        onlyShowWithPresence={true} profileID={item} popover={false}/>
                                  </div>)}
                </div>

            {/*
                <List grid={{ gutter: 6,
                    xs: 1,
                    sm: 1,
                    md: 2,
                    lg: 3,
                    xl: 4,
                    xxl: 4,
                }}
                      dataSource={Object.keys(this.state.presences).sort((a,b)=>(compareNames(a, b) ))}
                      renderItem={item => (<List.Item style={{marginBottom: 0}}><UserStatusDisplay key={item} onlyShowWithPresence={true} profileID={item} popover={false}/></List.Item>
                          )}>
                </List>
             */}

            {/* // BCP's first attempt at a better columnar layout...
                <div className="lobby-participant-list">
                Object.keys(this.state.presences).sort((a,b)=>(compareNames(a, b))).map(item => {<div style={{marginBottom: 0}}><UserStatusDisplay key={item} onlyShowWithPresence={true} profileID={item} popover={false}/></div>})
                </div>
             */}

                {/*<div style={{maxHeight: "80vh", overflow: 'auto', border: '1px sold #FAFAFA'}}>*/}
                    {/*    /!*<InfiniteScroll*!/*/}
                    {/*    /!*    pageStart={0}*!/*/}
                    {/*    /!*    // hasMore={Object.keys(this.state.activeUsers).length >= 20}*!/*/}
                    {/*    /!*    hasMore={this.hasMoreRoomsToShow()}*!/*/}
                    {/*    /!*    loadMore={this.displayMore.bind(this)}*!/*/}
                    {/*    /!*    useWindow={false}*!/*/}
                    {/*    /!*    initialLoad={false}*!/*/}
                    {/*    /!*    loader={<Spin>Loading...</Spin>}*!/*/}
                    {/*    /!*>*!/*/}
                    {/*        <Space style={{*/}
                    {/*            maxWidth: '80vw',*/}
                    {/*            display: "flex",*/}
                    {/*            marginLeft: "20px",*/}
                    {/*            flexWrap: "wrap"*/}
                    {/*        }}>*/}
                    {/*            {*/}
                    {/*                Object.values(allActiveRooms)//.slice(0, this.state.maxDisplayedRooms)*/}
                    {/*                    .map((item) => (*/}
                    {/*                    <MeetingSummary history={this.props.history} key={item.id} item={item} parseLive={this.props.parseLive} auth={this.props.auth} />*/}
                    {/*                ))}*/}
                    {/*        </Space>*/}
                    {/*    /!*</InfiniteScroll>*!/*/}
                    {/*</div>*/}
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
