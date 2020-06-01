import React, {Component} from 'react';
import * as ROUTES from "../../constants/routes";
import theme from "./theme";
import {MuiThemeProvider} from "@material-ui/core/styles";

import ParseLiveContext from "../parse/context";
import {AuthUserContext} from "../Session";
import EmbeddedVideoApp from "clowdr-video-frontend"

class EmbeddedVideoWrapper extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        let _this = this;
        if (!this.props.match) {
            return;
        }
        //TODO test this
        let roomID = this.props.match.params.roomId;
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
                                room: roomID,
                                identity: idToken,
                                conf: this.props.authContext.currentConference.get("conferenceName")
                            }),
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }).then(res => {
                        res.json().then((data) => {
                            _this.setState(
                                {
                                    meeting: roomID,
                                    meetingName: data.roomName,
                                    token: data.token,
                                    loadingMeeting: false
                                }
                            )
                            console.log(data.token);
                        })
                    });
                }
                else{
                    _this.setState({token: null});
                }

            }
        );

        //
        // setToken(data.token);
    }

    closeMeeting(meeting) {

        this.setState({token: null});
    }

    handleLogout() {
        this.props.history.push(ROUTES.LOBBY_SESSION);

    }

    render() {
        if (!this.state.meetingName || !this.state.token) {
            return <div>Loading...</div>
        }
        return (
            <MuiThemeProvider theme={theme}>
                <EmbeddedVideoApp.AppStateProvider meeting={this.state.meetingName} token={this.state.token}
                                                   onDisconnect={this.handleLogout.bind(this)}>
                    <div className={"videoEmbed"}>
                        <EmbeddedVideoApp.VideoEmbed/>
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
                    <EmbeddedVideoWrapper {...props} authContext={value}
                                          parseLive={parseValue}/>
                )}
            </AuthUserContext.Consumer>
        )
        }

    </ParseLiveContext.Consumer>
);
export default AuthConsumer;
