import React, {Component} from "react";
import {Card} from 'antd';
import moment from 'moment';
import AuthUserContext from "../Session/context";
import {ProgramContext} from "../Program";
import ReactPlayer from "react-player";
import {videoURLFromData} from './utils';

class ZoomPanel extends Component {
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
        this.video_url = videoURLFromData(src, id, pwd);
    }
    
    componentDidMount() {
    }

    componentWillUnmount() {
    }

//     toggleExpanded() {
// //        console.log('--> ' + this.state.expanded);
//         this.setState({
//             expanded: !this.state.expanded
//         });
//         this.props.onExpand(this.props.video);
//     }

    componentDidUpdate(prevProps) {
        console.log("[Zoom]: Something changed");
    }
    
    render() {

        let qa = "";
        if (this.props.vid && this.props.vid.id !== this.props.video.id) { // It's not us! Unmount!
            return <div></div>
        }
        
        let navigation = <a href={this.video_url} target={"_blank"} rel="noopener noreferrer">Join</a>

        return  <div>
                    <div><strong>{this.props.video.get('name')}</strong></div>
                    <div className="player-wrapper" >
                        <ReactPlayer playing playsinline light={true} playIcon={<img src="zoom.png" />} 
                                    width="100%" height="100%" style={{position:"absolute", top:0, left:0}} url={this.video_url}/>
                    </div>
                    <table style={{width:"100%"}}>
                        <tr >
                            <td style={{"text-align":"left"}}>Watching: {this.state.count}</td>
                            <td style={{"text-align":"right"}}><strong>{navigation}</strong></td>
                        </tr>
                    </table>
                </div>
    }
}

const LiveVideosArea = (props) => (
    <ProgramContext.Consumer>
        {({rooms, tracks, items, sessions, onDownload, downloaded}) => (
            <AuthUserContext.Consumer>
                {value => (
                    <ZoomPanel {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>
);

export default LiveVideosArea;
