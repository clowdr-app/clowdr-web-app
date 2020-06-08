import React, {Component, useCallback, useEffect, useState} from 'react';
import * as ROUTES from "../../constants/routes";
import theme from "./theme";
import {MuiThemeProvider} from "@material-ui/core/styles";
import Parse from "parse"
import {AuthUserContext} from "../Session";
import {Alert, Button, Form, message, Select, Skeleton, Spin, Tag, Tooltip, Typography} from "antd";
import './VideoChat.css';
import {VideoContext, VideoProvider} from "clowdr-video-frontend/lib/components/VideoProvider";
import AppStateProvider from "clowdr-video-frontend/lib/state";
import EmbeddedVideoWrapper from "./EmbeddedVideoWrapper";
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

const {Paragraph} = Typography;


class VideoRoom extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    async componentDidMount() {
        try {
            await this.joinCallFromProps();
        }catch(err){
            console.log(err);
        }
    }

    async joinCallFromProps() {
        if (!this.props.match) {
            return;
        }
        let confName = this.props.match.params.conf;
        let roomID = this.props.match.params.roomName;

        //find the room in parse...
        let BreakoutRoom = Parse.Object.extend("BreakoutRoom");
        let ClowdrInstance = Parse.Object.extend("ClowdrInstance");

        let slackQuery = new Parse.Query(ClowdrInstance);
        slackQuery.equalTo("conferenceName", confName)
        let roomQuery = new Parse.Query(BreakoutRoom);
        roomQuery.matchesQuery("conference", slackQuery)
        roomQuery.equalTo("title", roomID);
        roomQuery.include("members");
        roomQuery.include("conference");

        let room = await roomQuery.first();
        this.props.authContext.helpers.setGlobalState({currentRoom: room});
        if (!room) {
            this.setState({error: "invalidRoom"})
            return;
        }

        this.setState({loadingMeeting: 'true', room: room})

        let user = this.props.authContext.user;
        let _this = this;

        if (user) {
            let idToken = user.getSessionToken();
            const data = fetch(
                `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/token`

                // 'http://localhost:3001/video/token'
                , {
                    method: 'POST',
                    body: JSON.stringify({
                        room: room.id,
                        identity: idToken,
                        conf: room.get("conference").get("slackWorkspace")
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(res => {
                res.json().then((data) => {
                    _this.setState(
                        {
                            error: undefined,
                            meeting: room.id,
                            token: data.token,
                            loadingMeeting: false
                        }
                    )
                }).catch((err)=>{
                    this.setState({error: "authentication"});
                });
            });
        } else {
        }
    }

    closeMeeting(meeting) {
        this.setState({token: null});
    }

    handleLogout() {
        this.props.authContext.helpers.setGlobalState({currentRoom: null});
        this.props.history.push(ROUTES.LOBBY_SESSION);
    }


    async componentDidUpdate(prevProps) {
        let conf = this.props.match.params.conf;
        let roomID = this.props.match.params.roomName;
        if (this.props.authContext.user != prevProps.authContext.user || conf != this.state.conf || roomID !=this.state.meetingName){
            this.setState({conf: conf, meetingName: roomID, token: null});
            await this.joinCallFromProps();
        }
    }

    onError(err) {
        message.error({content: "Unable to join room. " + err.toString()})
        this.props.history.push(ROUTES.LOBBY_SESSION);
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
        //         <RoomVisibilityController authContext={this.props.authContext} roomID={this.state.room.id} sid={this.state.room.get("twilioID")} acl={this.state.room.getACL()}/>
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
            visibilityDescription = (<Tag key="visibility">Private</Tag>)
        } else {
            visibilityDescription = (<Tag key="visibility">Open</Tag>);
        }
        if(this.state.room.get("members") && this.state.room.get("members").length == this.state.room.get("capacity"))
        {
            fullLabel=<Tooltip title="This room is at capacity. Nobody else can join until someone leaves"><Tag color="#f50">Full Capacity</Tag></Tooltip>
        }
        if (this.state.room.get("persistence") == "ephemeral") {
            privacyDescription = (
                <Tooltip title="Garbage collects 5 minutes
                    after being empty"><Tag key="persistence">Ephemeral</Tag></Tooltip>)
        } else {
            privacyDescription = (<Tag key="persistence">Persistent</Tag>)
        }
        if (this.state.room.get("isPrivate")) {
            ACLdescription = (<RoomVisibilityController
                authContext={this.props.authContext} roomID={this.state.room.id} sid={this.state.room.get("twilioID")}
                acl={this.state.room.getACL()}/>);
        }
        let isP2P = this.state.room.get("mode") == "oeer-to-peer";
// See:
// for available connection options.https://media.twiliocdn.com/sdk/js/video/releases/2.0.0/docs/global.html#ConnectOptions
        let connectionOptions= {
            // Bandwidth Profile, Dominant Speaker, and Network Quality
            // features are only available in Small Group or Group Rooms.
            // Please set "Room Type" to "Group" or "Small Group" in your
            // Twilio Console: https://www.twilio.com/console/video/configure
            bandwidthProfile: {
                video: {
                    mode: 'collaboration',
                    // dominantSpeakerPriority: 'standard',
                    renderDimensions: {
                        high: { height: 1080, width: 1920 },
                        standard: { height: 720, width: 1280 },
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
            preferredVideoCodecs: [{codec: 'VP8', simulcast: true}],
        };
        if (isP2P) {
            connectionOptions = {
                audio: true,
                maxAudioBitrate: 16000, //For music remove this line
                video: {height: 720, frameRate: 24, width: 1280}
            }
        }

// For mobile browsers, limit the maximum incoming video bitrate to 2.5 Mbps.
        if (isMobile && connectionOptions.bandwidthProfile.video) {
            connectionOptions.bandwidthProfile.video.maxSubscriptionBitrate = 2500000;
            connectionOptions.video= {height: 480, frameRate: 24, width: 640};
        }
        return (
            <div>
                <h1>Lobby Session</h1>


                {/*{greeting}*/}
                <MuiThemeProvider theme={theme}>
                    <AppStateProvider meeting={this.state.meetingName} token={this.state.token}
                                      isEmbedded={true}
                                      onDisconnect={this.handleLogout.bind(this)}>
                        <VideoProvider onError={this.onError.bind(this)} isEmbedded={true} meeting={this.state.meetingName}
                                       options={connectionOptions}
                                       token={this.state.token} onDisconnect={this.handleLogout.bind(this)}>
                            <div style={{display:"flex"}}>
                                <div style={{flex:1}}>
                                    <h3>{this.state.meetingName} <VideoContext.Consumer>
                                        {
                                            videoContext => {
                                                let desc = videoContext.room.state;
                                                if(desc) {
                                                    desc = desc[0].toUpperCase() + desc.slice(1);
                                                    return <Tag>{desc}</Tag>
                                                }
                                                else{
                                                    return <Tag color={"warning"} icon={<SyncOutlined spin />}>Connecting...</Tag>
                                                }
                                            }
                                        }
                                    </VideoContext.Consumer>
                                        {visibilityDescription}
                                        {privacyDescription}{fullLabel}</h3>

                                </div>
                                <div style={{}}>
                                    <FlipCameraButton/><DeviceSelector/><ToggleFullscreenButton /> <ReportToModsButton room={this.state.room} />
                                </div>
                            </div>

                                {ACLdescription}
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
        <Tooltip title="Toggle Full Screen view">
        <IconButton aria-label={`full screen`} onClick={toggleFullScreen}>
            {isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>
        </Tooltip>
    ) : null;
}

class RoomVisibilityController extends React.Component {

    constructor(props) {
        super(props);
        this.state = {users: [], loading: true, selected: null, hasChange: false}
    }

    handleChange(value) {
        let isError = false;
        if (!value || !value.find(u => u == this.props.authContext.user.id))
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
        // let selected = await selectedQuery.find();
        this.props.authContext.helpers.getUsers();
        let profiles = await this.props.authContext.helpers.getUserProfilesFromUserIDs(selected);
        let selectedIDs = profiles.map(p=>p.get("user").id);
        this.setState({selected: selectedIDs, loading: this.props.authContext.users == undefined, users: this.props.authContext.users});
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(prevProps.authContext.users != this.props.authContext.users){
            this.setState({users: this.props.authContext.users, loadingUsers: false});
        }
    }

    async updateACL(values) {
        if (this.state.loading)
            return;
        this.setState({pendingSave: true});
        let users = values.users;
        let idToken = this.props.authContext.user.getSessionToken();
        const data = await fetch(
            `${process.env.REACT_APP_TWILIO_CALLBACK_URL}/video/acl`
            , {
                method: 'POST',
                body: JSON.stringify({
                    roomID: this.props.roomID,
                    users: users,
                    identity: idToken,
                    slackTeam: this.props.authContext.currentConference.get("slackWorkspace"),
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

    render() {
        if(!this.state.users || !this.state.selected)
            return <Skeleton />;
        const options = Object.keys(this.state.users).map(d => {
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
                     onFinish={this.updateACL.bind(this)}
                     layout="inline"
        >
            <Form.Item name="users"
                       label="Permitted Users:"
                       extra="Any user that you add here will see and manage this room">
                <Select
                    loading={this.state.loading}
                    mode="multiple" style={{width: '100%'}} placeholder="Users"
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
            <Tooltip title="Adjust Inputs">
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
            <VideoRoom {...props} authContext={value}
            />
        )}
    </AuthUserContext.Consumer>
);
export default withLoginRequired(AuthConsumer);
