import React, {Component} from "react";
import {Button, Space, Typography} from 'antd';
import Parse from "parse";

class ZoomPanel extends Component {
    constructor(props) {
        // props.parseLive
        super(props);
        this.state = {
            expanded: false,
            count: 0,
            china: false
        };
    }

    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("MeetingRegistration", this);
    }

    async componentDidMount() {
        if(this.props.auth.user){
            this.props.auth.programCache.getMeetingRegistrations(this).then(async (registrations)=>{
                let start_url = undefined;
                if(this.props.room && this.props.room.get("zoomRoom")){
                    let reg = registrations.find(v=>v.get("meetingID") == this.props.room.get("id1"))
                    let link;
                    if(!reg){
                        let res = await Parse.Cloud.run("zoom-meeting-register", {
                            room: this.props.room.get("zoomRoom").id
                        });
                        link = res.join_url;
                    }
                    else{
                        link = reg.get("link");
                    }
                    this.setState({MeetingRegistrations: registrations, personalJoinLink: link});
                }
            })
        }
        if(this.props.auth.isModerator && this.props.room){
            //Get the start url
            let zoomRoom = this.props.room.get("zoomRoom");
            if(zoomRoom){
                let rooms = await this.props.auth.programCache.getZoomRooms();
                zoomRoom = rooms.find(v=>v.id==zoomRoom.id);
                let start_url = zoomRoom.get("start_url");
                if(zoomRoom.get("start_url_expiration") < Date.now()){
                    let res = await Parse.Cloud.run("zoom-refresh-start-url", {
                        room: zoomRoom.id
                    });
                    start_url = res.start_url;
                }
                this.setState({
                    start_url: start_url
                });

            }
        }

    }

    async joinZoomByBrowser() {
        this.setState({zoomLoading: true});
        if (this.props.room && this.props.room.get("src1") &&
            this.props.room.get("src1").includes("Zoom")) {
            let res = await Parse.Cloud.run("zoom-getSignatureForMeeting", {
                conference: this.props.auth.currentConference.id,
                meeting: this.props.room.get("id1")
            });
            this.setState({
                zoomSignature: res.signature,
                zoomAPIKey: res.apiKey,
                zoomLoading: false
            })
        }

    }

    render() {
        let player =<div>???</div>;
        let wrapperClassName = "player-wrapper";
        if (this.state.zoomSignature) {
            let video_url = "/zoom/meeting.html?name=" + encodeURI(this.props.auth.user.get("displayname")) +
                "&mn=" + this.props.room.get("id1") + "&email=&pwd=" + this.props.room.get("pwd1")
                + "&role=0&lang=en-US&signature=" + this.state.zoomSignature +
                "&china=0&apiKey=" + this.state.zoomAPIKey
            player = <div><iframe width="100%" height="100%"
                             sandbox="allow-forms allow-scripts allow-same-origin"
                             allow="microphone; camera; fullscreen; "
                             style={{position: "absolute", top: 0, left: 0}}
                                  src={video_url}/>
                <Button danger className="leave-zoom-button" onClick={()=>{this.setState({zoomSignature: undefined})}}>Leave Zoom Call</Button></div>
        } else if (this.state.joinedByApp) {

        } else {
            wrapperClassName = "no-player-wrapper"
            player = <div><Typography.Title level={3}>Connect to Zoom</Typography.Title>
                    <p>
                        This event is taking place in Zoom. You may choose to join directly in your browser (only
                        compatible with Chrome and Edge), or
                        install the Zoom application if you haven't already and join in the app. We suggest joining
                        through the Zoom app if possible.
                    </p>
                    <Space><Button type="primary" disabled={this.state.zoomLoading} href={this.state.personalJoinLink} target="_blank" loading={!this.state.personalJoinLink}>Join By Zoom App</Button><Button
                        type="primary" onClick={() => {
                        this.joinZoomByBrowser();
                    }
                    } loading={this.state.zoomLoading}>Join by Browser</Button>{
                        this.props.auth.isModerator ? <Button type="primary" href={this.state.start_url} target="_blank" danger loading={!this.state.start_url} disabled={this.state.zoomLoading}>Join As Host</Button> : <></>}</Space></div>
        }
        return <div className={wrapperClassName}>{player}</div>
    }
}

export default ZoomPanel;
