import React, {Component} from "react";
import {Card} from 'antd';
import moment from 'moment';
import AuthUserContext from "../Session/context";
import {ProgramContext} from "../Program";
import ReactPlayer from "react-player";
import {videoURLFromData} from './utils';

class LiveStreamingPanel extends Component {
    constructor(props) {
        // props.parseLive
        super(props);
        this.state = {
            expanded: false,
            count: 0
        };
        let src = this.props.video.get("src1");
        let id = this.props.video.get("id1");
        let pwd = this.props.video.get("pwd1");
        this.video_url = src ? videoURLFromData(src, id, pwd): "";
    }
    
    changeSocialSpace() {
        if(this.props.video.get("socialSpace")) {
            //set the social space...
            let ss = this.props.video.get("socialSpace");
            this.props.auth.setSocialSpace(ss.get("name"));
            this.props.auth.helpers.setGlobalState({forceChatOpen: true});
        }        

    }

    componentDidMount() {
    }

    componentWillUnmount() {
    }

    toggleExpanded() {
//        console.log('--> ' + this.state.expanded);
        if (!this.state.expanded) // about to expand
            this.changeSocialSpace();
        else
            this.props.auth.helpers.setGlobalState({chatChannel: null, forceChatOpen: false});
            
        this.setState({
            expanded: !this.state.expanded
        });
        this.props.onExpand(this.props.video);
    }

    componentDidUpdate(prevProps) {
    }
    
    render() {

        let qa = "";
        if (this.props.vid && this.props.vid.id !== this.props.video.id) { // It's not us! Unmount!
            return <div></div>
        }
        
        let navigation="";
        let roomName = this.props.video.get('name');
        if (this.state.expanded) {
            navigation = <a href="#" onClick={this.toggleExpanded.bind(this)}>Go Back</a>
        }
        else {
            navigation = <a href="#" onClick={this.toggleExpanded.bind(this)}>Join</a>
            roomName = this.props.video.get('name').length < 10 ? this.props.video.get('name'): 
                        <span title={this.props.video.get('name')}>{this.props.video.get('name').substring(0,10) + "..."}</span>;
}
        return  <div>
                    <table style={{width:"100%"}}>
                        <tbody>
                        <tr >
                            <td style={{"textAlign":"left"}}><strong>{roomName}</strong></td>
                            <td style={{"textAlign":"center"}}>Viewers: {this.state.count}</td>
                            <td style={{"textAlign":"right"}}><strong>{navigation}</strong></td>
                        </tr>
                        </tbody>
                    </table>
                    <div className="player-wrapper" >
                        <ReactPlayer playing playsinline controls={true} muted={true} volume={1} 
                                    width="100%" height="100%" style={{position:"absolute", top:0, left:0}} url={this.video_url}/>
                    </div>
                    <div>
                        {this.props.mysessions.map(s => {
                            return <div key={s.id}>{s.get("title")}</div>
                        })}
                    </div>
                </div>
    }
}

const LiveVideosArea = (props) => (
    <ProgramContext.Consumer>
        {({rooms, tracks, items, sessions, people, onDownload, downloaded}) => (
            <AuthUserContext.Consumer>
                {value => (
                    <LiveStreamingPanel {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>
);

export default LiveVideosArea;
