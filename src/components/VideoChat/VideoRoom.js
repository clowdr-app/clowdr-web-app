import React, {Component} from 'react';
import * as ROUTES from "../../constants/routes";
import theme from "./theme";
import {MuiThemeProvider} from "@material-ui/core/styles";
import Parse from "parse"
import ParseLiveContext from "../parse/context";
import {AuthUserContext} from "../Session";
import EmbeddedVideoApp from "clowdr-video-frontend"
import {Alert, Spin} from "antd";

class VideoRoom extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    async componentDidMount() {
        this.joinCallFromProps();
    }

    async joinCallFromProps(){
        if (!this.props.match) {
            return;
        }
        let _this = this;
        let confName = this.props.match.params.conf;
        let roomID = this.props.match.params.roomName;
        if(!this.props.authContext.activeRoom){
            this.props.authContext.setActiveRoom(roomID);
        }

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
        if(!room){
            this.setState({error: "Sorry, but we are unable to find a video room called '" + roomID + "' in CLOWDR instance for Slack Team " + confName+ ". Please try to select a video room from the list on the right."})
            return;
        }

        this.setState({loadingMeeting: 'true'})
        this.props.authContext.refreshUser(
            (user)=>{
                if(user) {
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
                                    meetingName: data.roomName,
                                    token: data.token,
                                    loadingMeeting: false
                                }
                            )
                        })
                    });
                }
                else{
                    this.setState({token: null, nameOfWorkspace: room.get("conference").get('conferenceName'), conf: confName});
                }

            }
        );
    }
    closeMeeting(meeting) {
        this.setState({token: null});
    }

    handleLogout() {
        console.log("Handle Logout")
        this.props.history.push(ROUTES.LOBBY_SESSION);

    }


    componentDidUpdate(){
        let conf = this.props.match.params.conf;
        let roomID = this.props.match.params.roomName;
        if(conf != this.state.conf || roomID != this.state.meetingName) {
            this.setState({conf: conf, meetingName: roomID, token: null});
            console.log("Updated")
            this.joinCallFromProps();
        }
    }
    render() {
        if(this.state.error){
            console.log(this.props.roomName)
            return <Alert message="Invalid room." description={this.state.error} type="error" />
        }
        if(this.state.nameOfWorkspace){
            return <div>One last step! Please log in with slack in the {this.state.nameOfWorkspace} workspace  and typing `/video {this.state.meetingName}`, then clicking the "Join" link to get back to the right room.</div>
        }
        if (!this.state.meetingName || !this.state.token) {
            return <div><Spin />Loading...</div>
        }
        return (
            <MuiThemeProvider theme={theme}>
                <EmbeddedVideoApp.AppStateProvider meeting={this.state.meetingName} token={this.state.token}
                                                   onDisconnect={this.handleLogout.bind(this)}>
                    <div className={"videoEmbed"}>
                        <EmbeddedVideoApp.VideoEmbed />
                    </div>
                </EmbeddedVideoApp.AppStateProvider>
            </MuiThemeProvider>
        )
    }
}

const AuthConsumer = (props) => (
    <ParseLiveContext.Consumer>
        {parseValue => (
            <AuthUserContext.Consumer>
                {value => (
                    <VideoRoom {...props} authContext={value}
                                          parseLive={parseValue} />
                )}
            </AuthUserContext.Consumer>
        )
        }

    </ParseLiveContext.Consumer>
);
export default AuthConsumer;
