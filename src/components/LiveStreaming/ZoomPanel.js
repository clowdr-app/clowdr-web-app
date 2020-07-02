import React, {Component} from "react";
import {Button} from 'antd';
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
            count: 0, 
            china: false
        };
    }
    
    componentDidMount() {
        let country = this.props.auth.userProfile.get("country");
        var src = this.props.video.get("src1");
        var id = this.props.video.get("id1");
        var pwd = this.props.video.get("pwd1");

        var inChina = false;
        if (country && (country.toLowerCase().includes("china") || country.toLowerCase().trim() == "cn")) {
            // Commenting it for now until we get conformation of the Chinese URL
            // src = this.props.video.get("src2");
            // id = this.props.video.get("id2");
            inChina = true;
            console.log('User in China!');
        }
        this.setState({video_url: src ? videoURLFromData(src, id, pwd, country): "", china:inChina});
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
        
        if (this.props.vid && this.props.vid.id !== this.props.video.id) { // It's not us! Unmount!
            return <div></div>
        }

        let roomName = this.props.video.get('name').length < 10 ? this.props.video.get('name'): 
                        <span title={this.props.video.get('name')}>{this.props.video.get('name').substring(0,10) + "..."}</span>;

        let navigation = <a href={this.state.video_url} target={"_blank"} rel="noopener noreferrer"><Button type="primary" >Enter</Button></a>

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
