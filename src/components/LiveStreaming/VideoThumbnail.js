import React from 'react';
import LiveVideoPanel from "./LiveVideoPanel";
import {Modal, Card} from "antd";
import GeoLocationContext from '../GeoLocation/context';
import {videoURLFromData} from './utils'
import LiveVideoWatchers from './VideoWatchers';

const LiveVideoThumbnailSourceMappings = {
    YouTube : {
        url : "https://img.youtube.com/vi/",
        extraPath : "/0.jpg"
    }
}

class VideoThumbnail extends React.Component {
    constructor(props) {
        super(props);
        // props includes video
        this.state = {
            expanded: false
        };
        console.log(this.props.geoloc);
    }


    toggleExpanded() {
        this.setState({"expanded": !this.state.expanded}, () => {
            if (this.state.expanded) { 
                console.log("+1 " + this.props.video.get("title"));
            }
            else {
                // This is a hack to compensate for the fact that the Modal is inside the
                // Card. A click on onCancel of the modal also triggers onClick of the Card...
                // this.props.video.decrement("watchers", 0.5);
                console.log("-1 " + this.props.video.get("title"));
            }
            // this.props.video.save();
        });
    }

    render() {
        const src1 = this.props.video.get("src1");
        const id1 = this.props.video.get("id1");
        console.log('Rendering ' + src1 + "-" + id1);

        const video_url = videoURLFromData(src1, id1);

        if (this.props.geoloc)
            console.log(this.props.geoloc.country_code);

//        const thumbnail_url = LiveVideoThumbnailSourceMappings[src1].url + id1 + LiveVideoThumbnailSourceMappings[src1].extraPath;

        let modal = "";
        if (this.state.expanded) {
            modal = <Modal centered visible={true} cancelText={"Close"} width={"100%"} height={"100%"}
                        onCancel={this.toggleExpanded.bind(this)}
                        okButtonProps={{style: {display: 'none'}}}
            >
                <LiveVideoPanel video={this.props.video}/>
            </Modal>
        }
        return <Card title={this.props.video.get('title')} size="small" extra={<a href="#">Watch</a>} onClick={this.toggleExpanded.bind(this)}>
                <iframe title={this.props.title} src={video_url} allowFullScreen/>
                {modal}
                <LiveVideoWatchers video={this.props.video} expanded={this.state.expanded}/>
            </Card>
    }
}

const GeoLocationLiveVideoThumbnail = (props) => (
    <GeoLocationContext.Consumer>
        {value => (
            <VideoThumbnail {...props} geoloc={value}/>
        )}
    </GeoLocationContext.Consumer>
);


export default GeoLocationLiveVideoThumbnail;