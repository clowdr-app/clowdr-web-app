import React, {Component} from "react";
import {Button, Card, Spin} from 'antd';
import moment from 'moment';
import ReactPlayer from "react-player";
import {videoURLFromData} from './utils';
import zoomImg from "./zoom.png";
import Parse from "parse";
import ZoomPanel from "./ZoomPanel";
import RoomProgramSummary from "./RoomProgramSummary";
var timezone = require('moment-timezone');

class LiveStreamingPanel extends Component {
    constructor(props) {
        // props.parseLive
        super(props);
        this.state = {
            expanded: false,
            count: 0,
            video_url: undefined, 
            china: false
        };
    }


    joinChatChannels() {
        var items = [];
        this.props.mysessions.map(session => {
            if (session.get("items")) 
                items = items.concat(session.get("items")) 
        });

        // items.map(i => console.log("item: " + i.id+ " " + i.get("title") ));
        let chatChannels = items.map(i => i.get("chatSID"));
        chatChannels.map(cc => {
            if (cc) {
                console.log('[Live]: joining chat channel ' + cc);
                this.props.auth.chatClient.openChatAndJoinIfNeeded(cc);
            }
        })
    }

    joinChatChannel(sid) {
        if (sid)
            this.props.auth.chatClient.openChatAndJoinIfNeeded(sid);
        else
            console.log('[Live]: trying to joing chat channel with undef sid. Ignoring.');
    }

    async componentDidMount() {
        let country = this.props.auth.userProfile.get("country");
        var src = this.props.video.get("src1");
        var id = this.props.video.get("id1");
        var pwd = this.props.video.get("pwd1");
        this.props.auth.helpers.getPresences(this);


        var inChina = false;
        if (country && (country.toLowerCase().includes("china") || country.toLowerCase().trim() == "cn")) {
            src = this.props.video.get("src2");
            id = this.props.video.get("id2");
            inChina = true;
            console.log('User in China!');
        }
        // else
        //     console.log('User in ' + country ? country : "Unknown");
        // Where is this user?
        this.setState({video_url: src ? videoURLFromData(src, id, pwd, country): "", china:inChina});
    }

    componentWillUnmount() {
        if (this.state.expanded)
            this.props.auth.setSocialSpace("Lobby");
        this.props.auth.helpers.cancelPresenceSubscription(this);

    }

    toggleExpanded() {
       // console.log('--> ' + this.state.expanded);
        if (!this.state.expanded) {// about to expand
            this.changeSocialSpace();
            // this.joinChatChannels();
        }
        else{
            this.props.auth.setSocialSpace("Lobby");
        }

        this.setState({
            expanded: !this.state.expanded
        });
        this.props.onExpand(this.props.video);
    }

    componentDidUpdate(prevProps) {
        if(this.state.expanded != this.props.expanded){
            if (this.props.expanded){
                this.props.auth.setSocialSpace(null,this.props.video.get("socialSpace"));
                this.props.auth.helpers.setGlobalState({forceChatOpen: true});
                this.props.auth.helpers.setExpandedProgramRoom(this.props.video);
            }
            else{
                this.props.auth.helpers.setExpandedProgramRoom(null);
            }
            this.setState({expanded: this.props.expanded});
        }
    }
    
    render() {

        if (this.props.vid && this.props.vid.id !== this.props.video.id) { // It's not us! Unmount!
            return ""
        }
        
        let navigation="";
        let sessionData = "";
        let roomName = this.props.video.get('name');
        if (this.state.expanded) {

            sessionData = <RoomProgramSummary ProgramRoom={this.props.video} />
            navigation = <Button onClick={this.props.onExpand.bind(this)}>Go Back</Button>
        }
        else {
            navigation = <Button type="primary" onClick={this.props.onExpand.bind(this)}>Enter</Button>
            roomName = this.props.video.get('name').length < 10 ? this.props.video.get('name'): 
                        <span title={this.props.video.get('name')}>{this.props.video.get('name').substring(0,10) + "..."}</span>;

            sessionData = this.props.mysessions.slice(0,5).map(s => {
                            return <div key={s.id}><b>{moment(s.get("startTime")).tz(timezone.tz.guess()).calendar() + ": " + s.get("title")}</b></div>
                        })
            if(this.props.mysessions.length > 5){
                sessionData.push(<div key="more">... Plus {this.props.mysessions.length - 5} more sessions</div>)
            }

        }
        let viewers = 0;
        if (this.state.presences) {
            let presences = Object.values(this.state.presences);
            let pplInThisRoom = presences.filter(p => {
                return (p.get("socialSpace") && this.props.video.get("socialSpace") &&
                        p.get("socialSpace").id === this.props.video.get("socialSpace").id);
            });
            viewers = pplInThisRoom.length;
        }

        if (!this.state.video_url)
            return <Spin/>

        let player = "";
        let wrapperClassName = "player-wrapper";
        if (this.props.video.get("src1").includes("Zoom")) {
            wrapperClassName = "";
            if (this.props.expanded) {
                player = <ZoomPanel room={this.props.video} auth={this.props.auth}/>
            } else {
                player = <img alt="poster" style={{width: 311, height: 175}} src={zoomImg}/>
            }

        }
        else if (!this.state.china) {
            player = <ReactPlayer playing={this.props.playing} playsinline controls={true} muted={true} volume={1}
                        width="100%" height="100%" style={{position:"absolute", top:0, left:0}} url={this.state.video_url}/>
        }
        else {
            player = <iframe width="100%" height="100%" style={{position:"absolute", top:0, left:0}} src={this.state.video_url}/>
        }

        let description=<div>
            <div className="video-watchers-count">{viewers} here now</div>
            <div className="video-room-session-info">
                {sessionData}
            </div>
        </div>
        return <Card
            hoverable={!this.state.expanded}
                     cover={<div className={wrapperClassName} >
                         {player}

                     </div>
                     }
            actions={[
                navigation
                // <Button onClick={this.props.onExpand}>Enter</Button>
            ]}
        >
            <Card.Meta title={this.props.video.get("name")} description={description}></Card.Meta>
            </Card>
    }
}

export default LiveStreamingPanel;
