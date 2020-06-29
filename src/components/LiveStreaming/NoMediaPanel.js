import React, {Component} from "react";
import {Card} from 'antd';
import {StopOutlined} from "@ant-design/icons";

import AuthUserContext from "../Session/context";

class NoMediaPanel extends Component {
    constructor(props) {
        // props.parseLive
        super(props);
        this.state = {
            expanded: false,
            count: 0
        };
    }
    
    componentDidMount() {
    }

    componentWillUnmount() {
    }

    componentDidUpdate(prevProps) {
    }
    
    render() {

        let qa = "";
        if (this.props.vid && this.props.vid.id !== this.props.video.id) { // It's not us! Unmount!
            return <div></div>
        }
        
        let roomName = this.props.video.get('name').length < 35 ? this.props.video.get('name'): 
                        <span title={this.props.video.get('name')}>{this.props.video.get('name').substring(0, 35) + "..."}</span>;

        return  <div>
                    <table style={{width:"100%"}}>
                        <tbody>
                        <tr >
                            <td style={{"textAlign":"left"}}><strong>{roomName}</strong></td>
                        </tr>
                        </tbody>
                    </table>
                    <Card size="small" title={<StopOutlined />}>
                                    <p>No media available. </p>
                                    <p>Check the program for details.</p>
                                    <p>&nbsp;</p>
                                </Card>
                    <div>
                        {this.props.mysessions.map(s => {
                            return <div key={s.id}>{s.get("title")}</div>
                        })}
                    </div>
                </div>
    }
}

export default NoMediaPanel;
