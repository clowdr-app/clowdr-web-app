import React, {Component} from "react";
import {Card} from 'antd';
import moment from 'moment';
import AuthUserContext from "../Session/context";
import {ProgramContext} from "../Program";
import ReactPlayer from "react-player";
import {videoURLFromData} from './utils';
import zoomImg from './zoom.png';

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
        this.video_url = src ? videoURLFromData(src, id, pwd) : "";
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
    }
    
    render() {

        let qa = "";
        if (this.props.vid && this.props.vid.id !== this.props.video.id) { // It's not us! Unmount!
            return <div></div>
        }
        
        let roomName = this.props.video.get('name').length < 10 ? this.props.video.get('name'): 
                        <span title={this.props.video.get('name')}>{this.props.video.get('name').substring(0,10) + "..."}</span>;

        let navigation = <a href={this.video_url} target={"_blank"} rel="noopener noreferrer">Join</a>

        return  <div>
                    <table style={{width:"100%"}}>
                        <tbody>
                        <tr >
                            <td style={{"textAlign":"left"}}><strong>{roomName}</strong></td>
                            <td style={{"textAlign":"center"}}>&nbsp;</td>
                            <td style={{"textAlign":"right"}}><strong>{navigation}</strong></td>
                        </tr>
                        </tbody>
                    </table>
                    <img alt="poster" style={{width:311, height:175 }} src={zoomImg}  />

                    <div>
                        {this.props.mysessions.map(s => {
                            return <div key={s.id}>{s.get("title")}</div>
                        })}
                    </div>
                </div>
    }
}

export default ZoomPanel;
