import React from 'react';
import LiveVideoPanel from "./LiveVideoPanel";
import {Modal, Card} from "antd";

const LiveVideoThumbnailSourceMappings = {
    YouTube : {
        url : "https://img.youtube.com/vi/",
        extraPath : "/0.jpg"
    }
}

class VideoThumbnail extends React.Component {
    constructor(props) {
        super(props);
        this.state = {"expanded": false};
    }

    toggleExpanded() {
        this.setState({"expanded": !this.state.expanded});
    }

    render() {
        const src1 = this.props.video.get("src1");
        const id1 = this.props.video.get("id1");
        console.log(id1);

        const thumbnail_url = LiveVideoThumbnailSourceMappings[src1].url + id1 + LiveVideoThumbnailSourceMappings[src1].extraPath;

        let modal = "";
        if (this.state.expanded) {
            modal = <Modal visible={true} cancelText={"Close"} width={"100%"} height={"100%"}
                           onCancel={this.toggleExpanded.bind(this)}
                           okButtonProps={{style: {display: 'none'}}}
            >
                <LiveVideoPanel video={this.props.video}/>
            </Modal>
        }
        return <Card title={this.props.video.get('title')} onClick={this.toggleExpanded.bind(this)}>
            <img src={thumbnail_url}/>
            {modal}

        </Card>
    }
}

export default VideoThumbnail;