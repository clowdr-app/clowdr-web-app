import React, {Component, useState} from 'react';
import * as ROUTES from "../../constants/routes";
import theme from "./theme";
import {MuiThemeProvider} from "@material-ui/core/styles";
import Parse from "parse"
import ParseLiveContext from "../parse/context";
import {AuthUserContext} from "../Session";
import {Alert, Button, Descriptions, Form, message, Popover, Select, Skeleton, Spin,Tooltip, Typography} from "antd";
import './VideoChat.css';
import {VideoContext, VideoProvider} from "clowdr-video-frontend/lib/components/VideoProvider";
import AppStateProvider from "clowdr-video-frontend/lib/state";
import EmbeddedVideoWrapper from "./EmbeddedVideoWrapper";
import FlipCameraButton from "clowdr-video-frontend/lib/components/MenuBar/FlipCameraButton/FlipCameraButton";
import ToggleFullScreenButton
    from "clowdr-video-frontend/lib/components/MenuBar/ToggleFullScreenButton/ToggleFullScreenButton";
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
import SecurityIcon from '@material-ui/icons/Security';
import withLoginRequired from "../Session/withLoginRequired";
import NewRoomForm from "../Lobby/NewRoomForm";

const {Paragraph} = Typography;


class VideoRoom extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        this.joinCallFromProps();
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

    getMeetingInfo() {
        let res = []
        if (this.state.room.get("visibility") == "unlisted") {
            res.push(<Descriptions.Item label="Visibility" key="visibility">Private</Descriptions.Item>)
        } else {
            res.push(<Descriptions.Item label="Visibility" key="visibility">Public</Descriptions.Item>)
        }
        if (this.state.room.get("persistence") == "ephemeral") {
            res.push(<Descriptions.Item label="Persistence" key="persistence">Ephemeral (garbage collects 5 minutes
                after being empty)</Descriptions.Item>)
        } else {
            res.push(<Descriptions.Item label="Persistence" key="persistence">Persistent (until deleted by
                mods)</Descriptions.Item>)
        }
        if (this.state.room.get("visibility") == "unlisted") {
            res.push(<Descriptions.Item label="Access" key="access-controller"><RoomVisibilityController
                authContext={this.props.authContext} roomID={this.state.room.id} sid={this.state.room.get("twilioID")}
                acl={this.state.room.getACL()}/></Descriptions.Item>);
        }
        return res;
    }
    onError(err){
        console.log(err);
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

        let visibilityDescription, privacyDescription, ACLdescription;
        if (this.state.room.get("visibility") == "unlisted") {
            visibilityDescription = (<Descriptions.Item label="Visibility" key="visibility">Private</Descriptions.Item>)
        } else {
            visibilityDescription = (<Descriptions.Item label="Visibility" key="visibility">Public to {this.props.authContext.currentConference.get("conferenceName")}</Descriptions.Item>);
        }
        if (this.state.room.get("persistence") == "ephemeral") {
            privacyDescription = (
                <Descriptions.Item label="Persistence" key="persistence">Ephemeral (garbage collects 5 minutes
                    after being empty)</Descriptions.Item>)
        } else {
            privacyDescription = (<Descriptions.Item label="Persistence" key="persistence">Persistent (until deleted by
                mods)</Descriptions.Item>)
        }
        if (this.state.room.get("visibility") == "unlisted") {
            ACLdescription = (<Descriptions.Item label="Access" key="access-controller"><RoomVisibilityController
                authContext={this.props.authContext} roomID={this.state.room.id} sid={this.state.room.get("twilioID")}
                acl={this.state.room.getACL()}/></Descriptions.Item>);
        }
        return (
            <div>
                <h1>Lobby Session</h1>
                <h3>{this.state.meetingName}</h3>

                {/*{greeting}*/}
                <MuiThemeProvider theme={theme}>
                    <AppStateProvider meeting={this.state.meetingName} token={this.state.token}
                                      isEmbedded={true}
                                      onDisconnect={this.handleLogout.bind(this)}>
                        <VideoProvider onError={this.onError} isEmbedded={true} meeting={this.state.meetingName}
                                       token={this.state.token} onDisconnect={this.handleLogout.bind(this)}>
                            <Descriptions size="small" column={2}>
                                {visibilityDescription}
                                {privacyDescription}

                                <Descriptions.Item label="Status">
                                    <VideoContext.Consumer>
                                        {
                                            videoContext => (
                                                videoContext.room.state
                                            )
                                        }
                                    </VideoContext.Consumer>
                                </Descriptions.Item>
                                <Descriptions.Item
                                    label="Options"><FlipCameraButton/><DeviceSelector/><ToggleFullScreenButton/><HelpButton />
                                </Descriptions.Item>
                                {ACLdescription}
                            </Descriptions>
                        <div className={"videoEmbed"}>
                            <EmbeddedVideoWrapper />
                        </div></VideoProvider>
                    </AppStateProvider>
                </MuiThemeProvider>
            </div>
        )
    }
}

class HelpButton extends React.Component{
    render(){
        return       <Tooltip title="Report or Ban a User">

            <IconButton>
            <SecurityIcon color="secondary" />
        </IconButton>
        </Tooltip>
    }
}
class RoomVisibilityController extends React.Component {

    constructor(props) {
        super(props);
        this.state = {users: [], loading: true, selected: [], hasChange: false}
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
        this.setState({selected: selected});
        if(this.props.authContext.users){
            this.setState({users: this.props.authContext.users, loading: false});

        }
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if(prevProps.authContext.users != this.props.authContext.users){
            this.setState({users: this.props.authContext.users, loading: false});
        }
    }

    async updateACL(values) {
        if (this.state.loading)
            return;
        this.setState({pendingSave: true});
        let users = values.users;
        let theRole = this.state.selectedRole;
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
            message.error(res.message);
            this.setState({pendingSave: false})
        } else {
            this.setState({pendingSave: false})
            // this.props.history.push("/video/" + encodeURI(this.props.auth.currentConference.get("conferenceName")) + "/" + encodeURI(values.title));
        }

    }

    render() {
        const options = Object.keys(this.state.users).map(d => {
            return {
                label: this.state.users[d].get("displayname"), value:
                d
            };
        });
        let _this = this;
        //<Select.Option value={d.id} key={d.id}>{d.get("displayname")}</Select.Option>);

        let error;
        if(this.state.isError)
        error = <Alert type="warning"
               message={"Warning: you are removing yourself from this chat. You will not be able to return unless invited."}/>
        // const options = [];
        if (this.state.loading || this.state.users.length == 0)
            return <Skeleton.Input></Skeleton.Input>
        return <Form initialValues={{
            users: this.state.selected
        }}
                     onFinish={this.updateACL.bind(this)}
                     layout="inline"
        >
            <Form.Item name="users"
                       extra="Any user that you add here will see and manage this room from slack and this site.">
                <Select
                    loading={this.state.loading}
                    mode="multiple" style={{width: '100%'}} placeholder="Users"
                    filterOption={(input,option)=>option.label.toLowerCase().includes(input.toLowerCase())}
                    options={options}
                    onChange={this.handleChange.bind(this)}>
                </Select>
            </Form.Item>
            <Form.Item>
                <Button htmlTh1ype="submit" type={!this.state.hasChange ? "default" : "primary"} loading={this.state.pendingSave}>
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
            <IconButton onClick={() => setIsOpen(true)} data-cy-device-select>
                <SettingsInputComponentIcon />
            </IconButton>
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
    <ParseLiveContext.Consumer>
        {parseValue => (
            <AuthUserContext.Consumer>
                {value => (
                    <VideoRoom {...props} authContext={value}
                               parseLive={parseValue}/>
                )}
            </AuthUserContext.Consumer>
        )
        }

    </ParseLiveContext.Consumer>
);
export default withLoginRequired(AuthConsumer);
