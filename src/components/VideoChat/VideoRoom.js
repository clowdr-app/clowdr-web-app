import React, {Component, useCallback, useEffect, useState} from 'react';
import * as ROUTES from "../../constants/routes";
import theme from "./theme";
import {MuiThemeProvider} from "@material-ui/core/styles";
import Parse from "parse"
import {AuthUserContext} from "../Session";
import {
    Alert,
    Button,
    Form,
    message,
    notification,
    Popconfirm,
    Select,
    Skeleton,
    Spin,
    Tag,
    Tooltip,
    Typography
} from "antd";
import './VideoChat.css';
import {VideoContext, VideoProvider} from "clowdr-video-frontend/lib/components/VideoProvider";
import AppStateProvider from "clowdr-video-frontend/lib/state";
import IconButton from "@material-ui/core/IconButton";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import AudioInputList from "clowdr-video-frontend/lib/components/MenuBar/DeviceSelector/AudioInputList/AudioInputList";
import AudioOutputList
    from "clowdr-video-frontend/lib/components/MenuBar/DeviceSelector/AudioOutputList/AudioOutputList";
import VideoInputList from "clowdr-video-frontend/lib/components/MenuBar/DeviceSelector/VideoInputList/VideoInputList";
import {makeStyles} from "@material-ui/styles";
import {createStyles} from "@material-ui/core";
import SettingsInputComponentIcon from '@material-ui/icons/SettingsInputComponent';
import withLoginRequired from "../Session/withLoginRequired";
import NewRoomForm from "../Lobby/NewRoomForm";
import {isMobile} from "clowdr-video-frontend/lib/utils";
import useFullScreenToggle from "clowdr-video-frontend/lib/hooks/useFullScreenToggle/useFullScreenToggle";
import fscreen from "fscreen";
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit';
import FullscreenIcon from '@material-ui/icons/Fullscreen';
import FlipCameraIosIcon from '@material-ui/icons/FlipCameraIos';
import useVideoContext from "clowdr-video-frontend/lib/hooks/useVideoContext/useVideoContext";
import ReportToModsButton from "./ReportToModsButton";
import {SyncOutlined} from '@ant-design/icons'
import EmbeddedVideoWrapper from "./EmbeddedVideoWrapper";
import AboutModal from "../SignIn/AboutModal";

const {Paragraph} = Typography;


class VideoRoom extends Component {
    constructor(props) {
        super(props);
        this.state = {members: []};
    }

    async componentDidMount() {
        try {
            if(this.props.room){
                await this.joinCallEmbedded(this.props.room, this.props.conference);
            }else{
                await this.joinCallFromProps();
            }
        }catch(err){
            console.log(err);
        }
    }

    componentWillUnmount() {
        console.log("Unmounting video room")
        this.props.clowdrAppState.helpers.setGlobalState({currentRoom: null});
    }
    async joinCallFromProps(){
        if (!this.props.match) {
            return;
        }
        if(!this.props.clowdrAppState.user || (this.props.match.params.conf && this.props.match.params.conf != this.props.clowdrAppState.currentConference.get("conferenceName"))){
            this.props.clowdrAppState.refreshUser(this.props.match.params.conf).then((u)=>{
                this.joinCallFromPropsWithCurrentUser()
            })
        }
        else{
            this.joinCallFromPropsWithCurrentUser();
        }
    }

    async joinCallEmbedded(room, conf) {
        let user = this.props.clowdrAppState.user;

        this.setState({loadingMeeting: 'true', room: room})

        let _this = this;
        if (user) {
            let idToken = user.getSessionToken();
            const data = fetch(
                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/token`
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        room: room.id,
                        identity: idToken,
                        conf: conf.get("slackWorkspace"),
                        conference: conf.id
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(res => {
                if (res.status == 500) {
                    console.log("Error")
                    this.setState({
                        error: <span>Received an unexpected error 500/internal error from token server. Please refresh your browser and try again, or contact <a
                            href="mailto:help@clowdr.org">help@clowdr.org</a></span>
                    });

                } else {

                    res.json().then((data) => {
                        localStorage.setItem("videoReloads", 0);
                        localStorage.setItem("videoLoadTimeout", 0);
                        _this.setState(
                            {
                                error: undefined,
                                meeting: room.id,
                                token: data.token,
                                loadingMeeting: false,
                                meetingName: room.get("title")
                            }
                        )
                        if (_this.loadingMessage) {
                            _this.loadingMessage();
                        }
                        _this.loadingVideo = false;
                    })
                }
            }).catch((err) => {
                console.log("Error")
                this.loadingVideo = false;
                this.setState({error: "authentication"});
            });
        }
    }
    async deleteRoom(){
        let idToken = this.props.clowdrAppState.user.getSessionToken();
        this.setState({roomDeleteInProgress: true})

        const data = fetch(
            `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/deleteRoom`
            , {
                method: 'POST',
                body: JSON.stringify({
                    conference: this.props.clowdrAppState.currentConference.get("slackWorkspace"),
                    identity: idToken,
                    room: this.state.room.id,
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(()=>{
                this.setState({roomDeleteInProgress: false});
        })
    }
    async joinCallFromPropsWithCurrentUser() {
        console.log("Joining")

        if (!this.props.match) {
            return;
        }
        let confName = this.props.match.params.conf;
        let roomID = this.props.match.params.roomName;
        let parseRoomID = this.props.match.params.parseRoomID;
        if(confName && (confName == this.confName && roomID == this.roomID))
            return;
        if(this.loadingVideo)
            return;
        this.loadingVideo = true;
        this.confName = confName;
        this.roomID = roomID;

        //find the room in parse...
        let BreakoutRoom = Parse.Object.extend("BreakoutRoom");
        let ClowdrInstance = Parse.Object.extend("ClowdrInstance");

        let room;
        if(parseRoomID){
            let roomQuery = new Parse.Query(BreakoutRoom);
            room = await roomQuery.get(parseRoomID);
        }else{
            let slackQuery = new Parse.Query(ClowdrInstance);
            slackQuery.equalTo("conferenceName", confName)
            let roomQuery= new Parse.Query(BreakoutRoom);
            roomQuery.matchesQuery("conference", slackQuery)
            roomQuery.equalTo("title", roomID);
            roomQuery.include("members");
            roomQuery.include("conference");
            room = await roomQuery.first();
        }

        if (!room) {
            this.setState({error: "invalidRoom"})
            this.loadingVideo = false;
            return;
        }

        let _this = this;
        this.loadingMeeting = true;
        this.loadingMessage = null;
        let timeout = Number(window.localStorage.getItem("videoLoadTimeout"));
        if(Number(window.localStorage.getItem("videoReloads") > 3)){
            localStorage.setItem("videoReloads", 0);
            localStorage.setItem("videoLoadTimeout", 0);
            this.setState({error: <span>Sorry, but we were unable to connect you to the video room, likely due to a bug in this frontend. If this issue persists, please contact <a href="mailto:help@clowdr.org">help@clowdr.org</a></span>});
            this.loadingVideo = false;
            return;
        }
        if(!timeout){
            timeout = 0;
        }
        timeout = timeout + 10000;
        if(timeout > 20000){
            timeout = 20000;
        }
        window.localStorage.setItem("videoLoadTimeout", "" + timeout);
        let numReloads = Number(window.localStorage.getItem("videoReloads"));

        if (numReloads > 0) {
            _this.loadingMessage = message.loading('Sorry that this is taking longer than usual... we agree that this really shouldn\'t be happening!', 0);
        } else {
            setTimeout(function () {
                if (_this.loadingVideo) {
                    _this.loadingMessage = message.loading('Sorry that this is taking longer than usual...', 0);
                }
            }, 1000);
            }
        setTimeout(function(){
            if(_this.loadingVideo){
                window.localStorage.setItem("videoReloads", ""+(numReloads+1));
                // window.location.reload(false);
            }
        }, timeout);
        if(room.get("socialSpace"))
            this.props.clowdrAppState.setSocialSpace(null,room.get("socialSpace"));

        room = await this.props.clowdrAppState.helpers.populateMembers(room);
        console.log("Joining room, setting chat channel: " + room.get("twilioChatID"))
        // this.props.clowdrAppState.helpers.setGlobalState({currentRoom: room, chatChannel: room.get("twilioChatID")});
        let watchedByMe = false;
        if(this.props.clowdrAppState.userProfile.get("watchedRooms")){
            watchedByMe = this.props.clowdrAppState.userProfile.get("watchedRooms").find(v =>v.id ==room.id);
        }
        this.setState({loadingMeeting: 'true', room: room, watchedByMe: watchedByMe})

        let user = this.props.clowdrAppState.user;

        if (user) {
            if(room.get("twilioChatID"))
            this.props.clowdrAppState.chatClient.initChatClient(user, this.props.clowdrAppState.currentConference, this.props.clowdrAppState.userProfile).then(()=>{
                this.props.clowdrAppState.chatClient.openChatAndJoinIfNeeded(room.get("twilioChatID")).then((chan)=>{
                })
            });
            let idToken = user.getSessionToken();
            const data = fetch(
                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/token`
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        room: room.id,
                        identity: idToken,
                        conf: room.get("conference").get("slackWorkspace"),
                        conference: room.get("conference").id
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(res => {
                if (res.status == 500) {
                    console.log("Error")
                    this.setState({error: <span>Received an unexpected error 500/internal error from token server. Please refresh your browser and try again, or contact <a href="mailto:help@clowdr.org">help@clowdr.org</a></span>});

                } else {

                    res.json().then((data) => {
                        localStorage.setItem("videoReloads", 0);
                        localStorage.setItem("videoLoadTimeout", 0);
                        _this.setState(
                            {
                                error: undefined,
                                meeting: room.id,
                                token: data.token,
                                loadingMeeting: false,
                                meetingName: room.get("title")
                            }
                        )
                        if(_this.loadingMessage){
                            _this.loadingMessage();
                        }
                        _this.loadingVideo = false;
                    })
                }
            }).catch((err) => {
                console.log("Error")
                this.loadingVideo = false;
                this.setState({error: "authentication"});
            });
        } else {
        }
    }

    closeMeeting(meeting) {
        this.setState({token: null});
    }

    handleLogout() {
        if (this.props.onHangup) {
            this.props.onHangup();
        } else {
            this.props.history.push(ROUTES.LOBBY_SESSION);
            this.props.clowdrAppState.helpers.setGlobalState({currentRoom: null});
        }
    }


    async componentDidUpdate(prevProps, prevState, snapshot) {
        if(!this.props.room){
            let conf = this.props.match.params.conf;
            let roomID = this.props.match.params.roomName;
            if (this.props.clowdrAppState.user != prevProps.clowdrAppState.user || conf != this.state.conf || roomID !=this.state.meetingName){
                let confName = this.props.match.params.conf;
                let roomID = this.props.match.params.roomName;
                if((confName != this.confName || roomID != this.roomID) &&(!this.state.error || this.roomID != roomID))
                {
                    this.confName = null;
                    this.roomID = null;
                    this.setState({conf: conf, meetingName: roomID, token: null, error: null});
                    await this.joinCallFromProps();
                }
            }
        }
        if(this.state.room && this.state.room.get("members")){
            let hadChange = false;
            for(let member of this.state.room.get("members")){
                if(!this.state.members.find(v=>v.id == member.id)){
                    //new member appeared
                    hadChange = true;
                    // if (this.state.members.length > 0 && this.props.clowdrAppState.userProfile.id != member.id)
                    //     notification.info({
                    //         message: member.get("displayName") + " has joined this room",
                    //         placement: 'topLeft',
                    //     });
                }
            }
            for(let member of this.state.members){
                if(this.props.clowdrAppState.userProfile.id != member.id && !this.state.room.get("members").find(v=>v.id == member.id)){
                    hadChange = true;
                    // notification.info({
                    //     message: member.get("displayName") + " has left this room",
                    //     placement: 'topLeft',
                    // });
                }
            }
            if(hadChange)
                this.setState({members: this.state.room.get("members")});
        }
        // if (this.state.room && this.state.room.get("isPrivate")) {
            //Was there an update to the ACL?
            // let room = this.props.clowdrAppState.activePrivateVideoRooms.find(r => r.id == this.state.room.id);
            // console.log(room)
            // console.log(this.state.room.getACL().permissionsById)
            // if(room)
            // console.log(room.getACL().permissionsById);
            // if(room && room.getACL().permissionsById != this.state.room.getACL().permissionsById){
            //     console.log("Updated ACL")
            //     this.setState({room: room});
            // }
        // }
    }

    onError(err) {
        message.error({content: "Unable to join room. " + err.toString()})
        // this.props.history.push(ROUTES.LOBBY_SESSION);
    }
    async toggleWatch(){
        this.setState({watchLoading: true})
        let idToken = this.props.clowdrAppState.user.getSessionToken();

        const data = await fetch(
            `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/follow`
            , {
                method: 'POST',
                body: JSON.stringify({
                    roomID: this.state.room.id,
                    identity: idToken,
                    add: !this.state.watchedByMe,
                    slackTeam: this.props.clowdrAppState.currentConference.get("slackWorkspace"),
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        let res = await data.json();
        if (res.status == "error") {
            message.error({content: res.message, style:{zIndex: 2020}});
            this.setState({watchLoading: false});
        }
        else{
            if(!this.state.watchedByMe){
                //toggle to true
                let watched = this.props.clowdrAppState.userProfile.get("watchedRooms");
                if(!watched)
                    watched = [];
                watched.push(this.state.room);
                this.props.clowdrAppState.userProfile.set("watchedRooms", watched);
                await this.props.clowdrAppState.userProfile.save();
                notification.info({
                    message: "You're now watching this room. You'll get notifications like this one whenever someone comes or goes, regardless of which room you're in at the time",
                    placement: 'topLeft',
                });
                this.setState({watchedByMe: true, watchLoading: false});
            }
            else{
                let watched = this.props.clowdrAppState.userProfile.get("watchedRooms");
                if(!watched)
                    watched = [];
                watched = watched.filter(r => r.id != this.state.room.id);
                this.props.clowdrAppState.userProfile.set("watchedRooms", watched);
                await this.props.clowdrAppState.userProfile.save();
                notification.info({
                    message: "OK, you won't receive notifications about this room unless you're in it. We'll still notify you while you're here as people come and go.",
                    placement: 'topLeft',
                });
                this.setState({watchedByMe: false, watchLoading: false})
            }
        }


    }
    render() {
        if (this.state.error) {
            let description;
            let conf = this.props.match.params.conf;
            let roomID = this.props.match.params.roomName;

            if(this.state.error == "authentication"){
                description = <span>Sorry, we were not able to validate your access for the room '{roomID}'. Please double check that the room exists, and if it is a private room, that you have access to it. You might also try to re-login by typing '/video' in {conf} Slack, and selecting the room.</span>
            }
            else if(this.state.error == "invalidRoom"){
               description = <span>Sorry, but we are unable to find a video room called '{roomID}'
                   in the CLOWDR instance for Slack Team "{conf}".
                    Most rooms automatically garbage collect 5 minutes after the last member departs, so the room may have ceased to exist.
                    Please try to select a video room from the list on the left, or create a new room.
               <NewRoomForm /></span>
            }
            else{
                description=<span>Error message: {this.state.error}</span>
            }
            return <Alert message="Invalid room." description={description} type="error"/>
        }
        if (this.state.nameOfWorkspace) {
            return <div>One last step! Please log in with slack in the {this.state.nameOfWorkspace} workspace and typing
                `/video {this.state.meetingName}`, then clicking the "Join" link to get back to the right room.</div>
        }
        if (!this.state.meetingName || !this.state.token) {
            return <div><Spin/>Loading...</div>
        }
        // let greeting;
        // if (this.state.room.get("visibility") == "unlisted") {
        //
        //     greeting = <div>
        //         This room is private. Only the following users can see it:
        //         <RoomVisibilityController clowdrAppState={this.props.clowdrAppState} roomID={this.state.room.id} sid={this.state.room.get("twilioID")} acl={this.state.room.getACL()}/>
        //         Any user who can see this room can edit the access list.
        //     </div>
        //
        // } else {
        //     greeting = <Paragraph>
        //         Invite your friends to join this room by sharing this page's address, or telling them the name of this
        //         room ({this.state.meetingName}).
        //     </Paragraph>
        // }

        let visibilityDescription, privacyDescription, ACLdescription, fullLabel;
        if (this.state.room.get("isPrivate")) {
            visibilityDescription = (<Tooltip mouseEnterDelay={0.5} title="This room can only be accessed by users listed below."><Tag key="visibility" color="#2db7f5">Private</Tag></Tooltip>)
        } else {
            visibilityDescription = (<Tooltip mouseEnterDelay={0.5} title={"This room can be accessed by any member of " + this.props.clowdrAppState.currentConference.get("conferenceName")}><Tag key="visibility" color="#87d068">Open</Tag></Tooltip>);
        }
        if(this.state.room.get("members") && this.state.room.get("members").length == this.state.room.get("capacity"))
        {
            fullLabel=<Tooltip mouseEnterDelay={0.5} title="This room is at capacity. Nobody else can join until someone leaves"><Tag color="#f50">Full Capacity</Tag></Tooltip>
        }
        if (this.state.room.get("persistence") == "ephemeral") {
            privacyDescription = (
                <Tooltip mouseEnterDelay={0.5} title="This room wil be garbage collected after 5 minutes
                    of being empty"><Tag key="persistence" color="#2db7f5">Ephemeral</Tag></Tooltip>)
        } else {
            privacyDescription = (
                <Tooltip mouseEnterDelay={0.5} title="This room will exist until deleted by a moderator"><Tag key="persistence" color="#87d068">Persistent</Tag></Tooltip>
            )
        }
        if (this.state.room.get("isPrivate")) {
            ACLdescription = (<RoomVisibilityController
                clowdrAppState={this.props.clowdrAppState} roomID={this.state.room.id} sid={this.state.room.get("twilioID")}
                acl={this.state.room.getACL()}/>);
        }
        let nMembers = 0;
        let membersListColor = "#87d068";
        if(this.state.room.get("members"))
        {
            nMembers = this.state.room.get("members").length;
        }
        let freeSpots = this.state.room.get("capacity") - nMembers;
        if(freeSpots == 0){
            membersListColor = "#f50";
        }
        else if(freeSpots <= 2){
            membersListColor = "warning";
        }
        let isP2P = this.state.room.get("mode") == "peer-to-peer";
// See:
// for available connection options.https://media.twiliocdn.com/sdk/js/video/releases/2.0.0/docs/global.html#ConnectOptions
        let connectionOptions= {
            // Bandwidth Profile, Dominant Speaker, and Network Quality
            // features are only available in Small Group or Group Rooms.
            // Please set "Room Type" to "Group" or "Small Group" in your
            // Twilio Console: https://www.twilio.com/console/video/configure
            bandwidthProfile: {
                video: {
                    mode: 'grid',
                    maxTracks: 4,
                    // dominantSpeakerPriority: 'standard',
                    renderDimensions: {
                        high: { height: 720, width: 1080 },
                        standard: { height: 240, width: 320 },
                        low: {height:176, width:144}
                    },
                },
            },
            dominantSpeakerfalse: false,
            networkQuality: { local: 1, remote: 1 },

            // Comment this line if you are playing music.
            maxAudioBitrate: 16000,

            // VP8 simulcast enables the media server in a Small Group or Group Room
            // to adapt your encoded video quality for each RemoteParticipant based on
            // their individual bandwidth constraints. This has no effect if you are
            // using Peer-to-Peer Rooms.
            preferredVideoCodecs: [{codec: 'VP8', simulcast: false}],
        };
        if (isP2P) {
            connectionOptions = {
                audio: true,
                maxAudioBitrate: 16000, //For music remove this line
                video: {height: 480, frameRate: 24, width: 640}
            }
        }

        let nWatchers = 0;
        if(this.state.room.get("watchers")){
            nWatchers = this.state.room.get("watchers").length;
        }
// For mobile browsers, limit the maximum incoming video bitrate to 2.5 Mbps.
        if (isMobile && connectionOptions.bandwidthProfile.video) {
            connectionOptions.bandwidthProfile.video.maxSubscriptionBitrate = 2500000;
            connectionOptions.video= {height: 480, frameRate: 24, width: 640};
        }
        return (
            <div>
                <AboutModal />

                {/*{greeting}*/}
                <MuiThemeProvider theme={theme}>
                    <AppStateProvider meeting={this.state.meetingName} token={this.state.token}
                                      isEmbedded={true}
                        onConnect={(room,videoContext)=>{
                            // if(this.state.room.get("mode") == "group") {
                            //     let localTracks = videoContext.localTracks;
                            //     const audioTrack = localTracks.find(track => track.kind === 'audio');
                            //     audioTrack.disable();
                            // }

                        }
                    }
                                      onDisconnect={this.handleLogout.bind(this)}>
                        <VideoProvider onError={this.onError.bind(this)} isEmbedded={true} meeting={this.state.meetingName}
                                       options={connectionOptions}

                                       token={this.state.token} onDisconnect={this.handleLogout.bind(this)}>
                            <div style={{display:"flex"}}>
                                <div style={{flex:1}}>
                                    {this.props.hideInfo? (<VideoContext.Consumer>
                                        {
                                            videoContext => {
                                                let desc = videoContext.room.state;
                                                if(desc) {
                                                    desc = desc[0].toUpperCase() + desc.slice(1);
                                                    let color = "red";
                                                    if(desc == "Connected"){
                                                        color = "#87d068";
                                                    }
                                                    return <Tag color={color}>{desc}</Tag>
                                                }
                                                else{
                                                    return <Tag color={"warning"} icon={<SyncOutlined spin />}>Connecting...</Tag>
                                                }
                                            }
                                        }
                                    </VideoContext.Consumer>) :(<h3>{this.state.meetingName} <VideoContext.Consumer>
                                        {
                                            videoContext => {
                                                let desc = videoContext.room.state;
                                                if(desc) {
                                                    desc = desc[0].toUpperCase() + desc.slice(1);
                                                    let color = "red";
                                                    if(desc == "Connected"){
                                                        color = "#87d068";
                                                    }
                                                    return <Tag color={color}>{desc}</Tag>
                                                }
                                                else{
                                                    return <Tag color={"warning"} icon={<SyncOutlined spin />}>Connecting...</Tag>
                                                }
                                            }
                                        }
                                    </VideoContext.Consumer>
                                        <Tooltip mouseEnterDelay={0.5} title={"This room was created as a " +
                                        this.state.room.get("mode") + " room with a capacity of " +
                                        this.state.room.get("capacity") +", there's currently " + (this.state.room.get("capacity") - nMembers) + " spot"+((this.state.room.get("capacity") - nMembers) !=1 ? "s":"" )+" available."} ><Tag color={membersListColor}>{nMembers+"/"+this.state.room.get("capacity")}</Tag></Tooltip>
                                        {fullLabel}{visibilityDescription}
                                        {privacyDescription}</h3>)}


                                    {/*<div style={{width: "100%", display:"flex"}}>*/}
                                    {/*    <Collapse style={{flexGrow: 1}}>*/}
                                    {/*        <Collapse.Panel key="watchers" header={"Users following this room: "+nWatchers}>*/}
                                    {/*            <List size="small" renderItem={item => <List.Item><UserDescriptor id={item.id} /></List.Item>}*/}
                                    {/*            dataSource={this.state.room.get("watchers")}*/}
                                    {/*            />*/}

                                    {/*        </Collapse.Panel>*/}
                                    {/*    </Collapse>*/}
                                    {/*    <Tooltip mouseEnterDelay={0.5} title="Follow this room to get notifications in-app when people come and go">*/}
                                    {/*        <Switch checkedChildren="Following" unCheckedChildren="Not Following" onChange={this.toggleWatch.bind(this)}*/}
                                    {/*                loading={this.state.watchLoading}*/}
                                    {/*                style={{marginTop: "5px", marginLeft:"5px"}} checked={this.state.watchedByMe}/></Tooltip>*/}
                                    {/*</div>*/}
                                </div>
                                <div style={{}}>
                                    <FlipCameraButton/><DeviceSelector/><ToggleFullscreenButton /> <ReportToModsButton room={this.state.room} />
                                </div>
                            </div>

                                {ACLdescription}

                            {(this.props.clowdrAppState.user && !this.props.hideInfo && this.props.clowdrAppState.permissions.includes("moderator") ? <Popconfirm title="Are you sure you want to delete and end this room?"
                            onConfirm={this.deleteRoom.bind(this)}><Button size="small" danger loading={this.state.roomDeleteInProgress}>Delete Room</Button></Popconfirm> : <></>)}

                            {!this.props.hideInfo ? <div>
                                {(this.state.room.get("mode") == "group" ? <span>This is a big group room. It supports up to 50 participants, but will only show the video of the most active participants. Click a participant to pin them to always show their video. </span> :
                                    this.state.room.get("mode") == "peer-to-peer" ? "This is a peer to peer room. It supports up to 10 participants, but the quality may not be as good as a group room": "This is a small group room. It supports up to 4 participants.")}
                            </div> :<></>}
                        <div className={"videoEmbed"}>
                            <EmbeddedVideoWrapper />
                        </div></VideoProvider>
                    </AppStateProvider>
                </MuiThemeProvider>
            </div>
        )
    }
}
function FlipCameraButton() {
    const {
        room: { localParticipant },
        localTracks,
        getLocalVideoTrack,
    } = useVideoContext();
    const [supportsFacingMode, setSupportsFacingMode] = useState(null);
    const videoTrack = localTracks.find(track => track.name.includes('camera'));
    const facingMode = videoTrack?.mediaStreamTrack.getSettings().facingMode;

    useEffect(() => {
        // The 'supportsFacingMode' variable determines if this component is rendered
        // If 'facingMode' exists, we will set supportsFacingMode to true.
        // However, if facingMode is ever undefined again (when the user unpublishes video), we
        // won't set 'supportsFacingMode' to false. This prevents the icon from briefly
        // disappearing when the user switches their front/rear camera.
        if (facingMode && supportsFacingMode === null) {
            setSupportsFacingMode(facingMode);
        }
    }, [facingMode, supportsFacingMode]);

    const toggleFacingMode = useCallback(() => {
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';

        if(videoTrack)
        videoTrack.stop();

        getLocalVideoTrack({ facingMode: newFacingMode }).then(newVideoTrack => {
            const localTrackPublication = localParticipant.unpublishTrack(videoTrack);
            // TODO: remove when SDK implements this event. See: https://issues.corp.twilio.com/browse/JSDK-2592
            localParticipant.emit('trackUnpublished', localTrackPublication);

            localParticipant.publishTrack(newVideoTrack, { priority: 'low' });
        });
    }, [facingMode, getLocalVideoTrack, localParticipant, videoTrack]);

    return supportsFacingMode ? (
        <IconButton onClick={toggleFacingMode} disabled={!videoTrack}>
            <FlipCameraIosIcon />
        </IconButton>
    ) : null;
}
function ToggleFullscreenButton() {
    const [isFullScreen, toggleFullScreen] = useFullScreenToggle();

    return fscreen.fullscreenEnabled ? (
        <Tooltip mouseEnterDelay={0.5} title="Toggle Full Screen view">
        <IconButton aria-label={`full screen`} onClick={toggleFullScreen}>
            {isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>
        </Tooltip>
    ) : null;
}

class RoomVisibilityController extends React.Component {

    constructor(props) {
        super(props);
        this.state = {users: [],  hasChange: false, loadedUsers: false}
    }

    handleChange(value) {
        let isError = false;
        if (!value || !value.find(u => u == this.props.clowdrAppState.user.id))
            isError = true;
        let hasChange = false;
        if (this.state.selected.length != value.length)
            hasChange = true;
        else {
            for (let u of this.state.selected)
                if (!value.includes(u.id))
                    hasChange = true;
        }

        this.setState({hasChange: hasChange, isError: isError})
    }

    async componentDidMount() {
        let selected = Object.keys(this.props.acl.permissionsById).filter(v=>!v.startsWith("role"));
        let profiles = await this.props.clowdrAppState.helpers.getUserProfilesFromUserIDs(selected);
        let selectedIDs = profiles.map(p=>p.get("user").id);
        this.setState({selected: selectedIDs, users: profiles});
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(prevProps.acl.permissionsById != this.props.acl.permissionsById){
            if (this.aclSelector)
            {
                let newValue={
                    "users": Object.keys(this.props.acl.permissionsById).filter(v=>!v.startsWith("role"))
                }
                this.aclSelector.setFieldsValue(newValue);
            }
        }
    }

    async updateACL(values) {
        if (this.state.loading)
            return;
        this.setState({pendingSave: true});
        let users = values.users;
        let idToken = this.props.clowdrAppState.user.getSessionToken();
        const data = await fetch(
            `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/acl`
            , {
                method: 'POST',
                body: JSON.stringify({
                    roomID: this.props.roomID,
                    users: users,
                    identity: idToken,
                    slackTeam: this.props.clowdrAppState.currentConference.get("slackWorkspace"),
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        let res = await data.json();
        if (res.status == "error") {
            message.error({content: res.message, style:{zIndex: 2020}});
            this.setState({pendingSave: false})
        } else {
            this.setState({pendingSave: false})
            // this.props.history.push("/video/" + encodeURI(this.props.auth.currentConference.get("conferenceName")) + "/" + encodeURI(values.title));
        }

    }

    async handleSearch(value){
        if (!this.triggeredUserLoad) {
            this.setState({loading: true})
            this.triggeredUserLoad = true;
            let users = await this.props.clowdrAppState.helpers.getUsers();
            this.setState({loading: false, users: users});
        }
    }

    render() {
        if(!this.state.users || !this.state.selected)
            return <Skeleton />;
        const options = Object.keys(this.state.users).map(d => {
            if(!this.state.users[d].get('displayName'))
                return {
                label: "undefined",
                    value: this.state.users[d].get("user").id
                }
            return {
                label: this.state.users[d].get("displayName"), value:
                this.state.users[d].get("user").id
            };
        });
        let _this = this;
        //<Select.Option value={d.id} key={d.id}>{d.get("displayname")}</Select.Option>);

        let error;
        if(this.state.isError)
        error = <Alert type="warning"
               message={"Warning: you are removing yourself from this chat. You will not be able to return unless invited."}/>
        // const options = [];
        return <Form initialValues={{
            users: this.state.selected
        }}
                     ref={(el) => { this.aclSelector = el; }}
                     onFinish={this.updateACL.bind(this)}
                     layout="inline"
        >
            <div>Visible to:</div>
            <Form.Item name="users"
                       className="aclSelector"
                       extra="Any user that you add here will see and manage this room">
                <Select
                    loading={this.state.loading}
                    mode="multiple" style={{width: '100%'}} placeholder="Users"
                    onSearch={this.handleSearch.bind(this)}
                    filterOption={(input,option)=>option.label.toLowerCase().includes(input.toLowerCase())}
                    options={options}
                    onChange={this.handleChange.bind(this)}>
                </Select>
            </Form.Item>
            <Form.Item>
                <Button htmlType="submit" type={!this.state.hasChange ? "default" : "primary"} loading={this.state.pendingSave}>
                    Update
                </Button>
            </Form.Item>
            {error}
        </Form>

    }
}
const useStyles = makeStyles((theme) =>
    createStyles({
        container: {
            width: '500px',
            [theme.breakpoints.down('xs')]: {
                width: 'calc(100vw - 32px)',
            },
            '& .inputSelect': {
                width: 'calc(100% - 35px)',
            },
        },
        listSection: {
            margin: '1em 0',
        },
        button: {
            float: 'right',
        },
        paper: {
            [theme.breakpoints.down('xs')]: {
                margin: '16px',
            },
        },
    })
);

export function DeviceSelector() {
    const classes = useStyles();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Tooltip mouseEnterDelay={0.5} title="Adjust Inputs">
            <IconButton onClick={() => setIsOpen(true)} data-cy-device-select>
                <SettingsInputComponentIcon />
            </IconButton>
            </Tooltip>
            <Dialog open={isOpen} onClose={() => setIsOpen(false)} classes={{ paper: classes.paper }}>
                <DialogContent className={classes.container}>
                    <div className={classes.listSection}>
                        <AudioInputList />
                    </div>
                    <div className={classes.listSection}>
                        <AudioOutputList />
                    </div>
                    <div className={classes.listSection}>
                        <VideoInputList />
                    </div>
                    <Button className={classes.button} onClick={() => setIsOpen(false)}>
                        Done
                    </Button>
                </DialogContent>
            </Dialog>
        </>
    );
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <VideoRoom {...props} clowdrAppState={value}
            />
        )}
    </AuthUserContext.Consumer>
);
export default withLoginRequired(AuthConsumer);
