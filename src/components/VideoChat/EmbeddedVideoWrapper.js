import App from "../../twilio-video-app-react/embed.tsx"
import React, {Component} from 'react';
import VideoChat from "./index";
import {Modal} from "antd";

import OldVideoChat from "./examplecode/Room";
import * as ROUTES from "../../constants/routes";

class EmbeddedVideoWrapper extends Component {
    constructor(props) {
        super(props);
        this.state ={};
    }

    componentDidMount() {
        let _this = this;
        if(!this.props.match){
            return;
        }
        let roomID = this.props.match.params.roomId;
        this.setState({loadingMeeting: 'true'})
        if(!this.props.firebase.auth.currentUser){
            return;
        }
        this.props.firebase.auth.currentUser.getIdToken(/* forceRefresh */ true).then(function (idToken) {
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
        }).catch(function (error) {
            // Handle error
        });


        //
        // setToken(data.token);
    }

    closeMeeting(meeting) {

        this.setState({token: null});
    }

    handleLogout(){
        this.props.history.push(ROUTES.LOBBY_SESSION);

    }
    render() {
        if(!this.state.meetingName || !this.state.token){
            return <div>Loading...</div>
        }
        return <div>
            <App meeting={this.state.meetingName} meetingID={this.state.meeting} token={this.state.token} onDisconnect={this.handleLogout.bind(this)} />
            {/*<OldVideoChat roomName={this.state.meeting} token={this.state.token} handleLogout={this.handleLogout} />*/}

        </div>
    }
}

export default EmbeddedVideoWrapper;
