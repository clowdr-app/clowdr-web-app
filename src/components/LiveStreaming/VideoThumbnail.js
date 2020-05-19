import React from 'react';
import LiveVideoPanel from "./LiveVideoPanel";
import {Modal, Card} from "antd";

class VideoThumbnail extends React.Component {
    constructor(props) {
        super(props);
        this.state = {"expanded": false};
    }

    toggleExpanded() {
        this.setState({"expanded": !this.state.expanded});
    }

    render() {
        const thumbnail_url = `https://img.youtube.com/vi/${this.props.video.id}/0.jpg`

        // return <div>{this.props.video.data.title}, {this.props.video.id}</div>
        let modal = "";
        if (this.state.expanded) {
            modal = <Modal visible={true} cancelText={"Close"} width={"100%"} height={"100%"}
                           onCancel={this.toggleExpanded.bind(this)}
                           okButtonProps={{style: {display: 'none'}}}
            >
                <LiveVideoPanel video={this.props.video}/>
            </Modal>
        }
        return <Card title={this.props.video.data.title} onClick={this.toggleExpanded.bind(this)}>
            <img src={thumbnail_url}/>
            {modal}

        </Card>
    }
}

export default VideoThumbnail;