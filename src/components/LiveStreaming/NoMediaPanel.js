import React, { Component } from "react";
import { Card } from 'antd';

import nomediaImg from "./nomedia.png";

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

        if (this.props.vid && this.props.vid.id !== this.props.video.id) { // It's not us! Unmount!
            return <div></div>
        }

        let roomName = this.props.video.get('name').length < 35 ? this.props.video.get('name') :
            <span title={this.props.video.get('name')}>{this.props.video.get('name').substring(0, 35) + "..."}</span>;

        return <Card hoverable
            cover={<img alt="poster" style={{ width: 311, height: 175 }} src={nomediaImg} />}
        >
            <Card.Meta title={roomName}
                description={<div>
                    {this.props.mysessions.map(s => {
                        return <div key={s.id}>{s.get("title")}</div>
                    })}
                </div>}></Card.Meta>
        </Card>
    }
}

export default NoMediaPanel;
