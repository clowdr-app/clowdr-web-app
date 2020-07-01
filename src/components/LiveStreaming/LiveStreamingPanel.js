import React, {Component} from "react";
import {Button, Card, Spin} from 'antd';
import moment from 'moment';
import ReactPlayer from "react-player";
import {videoURLFromData} from './utils';

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
    

    async componentDidMount() {
        let country = this.props.auth.userProfile.get("country");
        var src = this.props.video.get("src1");
        var id = this.props.video.get("id1");
        var pwd = this.props.video.get("pwd1");

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
    }

    componentDidUpdate(prevProps) {
        if(this.state.expanded != this.props.expanded){
            if(this.props.expanded){
                this.props.auth.setSocialSpace(null,this.props.video.get("socialSpace"));
                this.props.auth.helpers.setGlobalState({forceChatOpen: true});
            }
            this.setState({expanded: this.props.expanded});
        }
    }
    
    render() {

        let qa = "";
        if (this.props.vid && this.props.vid.id !== this.props.video.id) { // It's not us! Unmount!
            return ""
        }
        
        let navigation="";
        let roomName = this.props.video.get('name');
        if (this.state.expanded) {
            navigation = <Button onClick={this.props.onExpand.bind(this)}>Go Back</Button>
        }
        else {
            navigation = <Button onClick={this.props.onExpand.bind(this)}>Enter</Button>
            roomName = this.props.video.get('name').length < 10 ? this.props.video.get('name'): 
                        <span title={this.props.video.get('name')}>{this.props.video.get('name').substring(0,10) + "..."}</span>;
        }
        let viewers = 0;
        if (this.props.auth.presences) {
            let presences = Object.values(this.props.auth.presences);
            let pplInThisRoom = presences.filter(p => {
                return (p.get("socialSpace") && this.props.video.get("socialSpace") &&
                        p.get("socialSpace").id === this.props.video.get("socialSpace").id);
            });
            viewers = pplInThisRoom.length;
        }

        if (!this.state.video_url)
            return <Spin />

        let player = "";
        if (!this.state.china) {
            player = <ReactPlayer playing playsinline controls={true} muted={true} volume={1}
                        width="100%" height="100%" style={{position:"absolute", top:0, left:0}} url={this.state.video_url}/>
        }
        else {
            player = <iframe width="100%" height="100%" style={{position:"absolute", top:0, left:0}} src={this.state.video_url}/>
        }

        let sessionInfo = this.props.mysessions.map(s => {
                return <div key={s.id}>{s.get("title")}</div>
            });

        let description=<div>
            <div className="video-watchers-count">{viewers} here now</div>
            <div className="video-room-session-info">
                {this.props.mysessions.map(s => {
                    return <div>{moment(s.get("startTime")).format('LT') + ": " + s.get("title")}</div>
                })}
            </div>
        </div>
        return <Card
            hoverable
                     cover={<div className="player-wrapper" >
                         {player}

                     </div>
                     }
            actions={[
                navigation
                // <Button onClick={this.props.onExpand}>Enter</Button>
            ]}
        >
            <Card.Meta title={this.props.video.get("name")} description={description}></Card.Meta>
            {/*<table style={{width:"100%"}}>*/}
            {/*    <tbody>*/}
            {/*    <tr >*/}
            {/*        <td style={{"textAlign":"left"}}><strong>{roomName}</strong></td>*/}
                    {/*        <td style={{"textAlign":"left"}}>Viewers: {viewers}</td>*/}
                    {/*        <td style={{"textAlign":"right"}}><strong>{navigation}</strong></td>*/}
                    {/*    </tr>*/}
                    {/*    </tbody>*/}
                    {/*</table>*/}
                    {/*<div className="player-wrapper" >*/}
                    {/*    <ReactPlayer playing playsinline controls={true} muted={true} volume={1} */}
                    {/*                width="100%" height="100%" style={{position:"absolute", top:0, left:0}} url={this.video_url}/>*/}
                    {/*</div>*/}
                    <div>

                    </div>
                </Card>
    }
}

export default LiveStreamingPanel;
