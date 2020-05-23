import App from "../../twilio-video-app-react/embed.tsx"
import React, {Component} from 'react';
import * as ROUTES from "../../constants/routes";
import ParseLiveContext from "../parse/context";
import {AuthUserContext} from "../Session";

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
        let roomID = this.props.match.params.roomId;
        this.setState({loadingMeeting: 'true'})
        if (!this.props.user) {
            return;
        }
        let idToken = this.props.user.getSessionToken();
        const data = fetch(
            'https://a9ffd588.ngrok.io/video/token'
            // 'http://localhost:3001/video/token'
            , {
                method: 'POST',
                body: JSON.stringify({
                    room: roomID,
                    identity: idToken
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
        return <div>
            <App meeting={this.state.meetingName} meetingID={this.state.meeting} token={this.state.token}
                 onDisconnect={this.handleLogout.bind(this)}/>
            {/*<OldVideoChat roomName={this.state.meeting} token={this.state.token} handleLogout={this.handleLogout} />*/}

        </div>
    }
}

const AuthConsumer = (props) => (
    <ParseLiveContext.Consumer>
        {parseValue => (
            <AuthUserContext.Consumer>
                {value => (
                    <EmbeddedVideoWrapper {...props} user={value.user} refreshUser={value.refreshUser}
                                          parseLive={parseValue}/>
                )}
            </AuthUserContext.Consumer>
        )
        }

    </ParseLiveContext.Consumer>
);
export default AuthConsumer;
