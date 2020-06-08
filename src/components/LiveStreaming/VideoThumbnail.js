import React from 'react';
import LiveVideoPanel from "./LiveVideoPanel";
import {Modal, Card} from "antd";
import GeoLocationContext from '../GeoLocation/context';
import {videoURLFromData} from './utils'

const LiveVideoThumbnailSourceMappings = {
    YouTube : {
        url : "https://img.youtube.com/vi/",
        extraPath : "/0.jpg"
    }
}

class VideoThumbnail extends React.Component {
    constructor(props) {
        super(props);
        // props includes video and watchers
        var w = this.props.watchers.filter(w =>  w.get("video") == this.props.video.id );
        this.state = {
            expanded: false,
            count: w.length
        };
    }

    componentDidMount() {
    }

    componentDidUpdate(prevProps) {
        // Typical usage (don't forget to compare props):
        if (prevProps.watchers.length !== this.props.watchers.length) {
            var w = this.props.watchers.filter(w =>  w.get("video") == this.props.video.id );
            if (w.length !== this.state.count) {
                this.setState({count: w.length});
            }
        }
    }

    toggleExpanded() {
        this.setState({"expanded": !this.state.expanded});
    }

    render() {
        const src1 = this.props.video.get("src1");
        const id1 = this.props.video.get("id1");
        // console.log('Rendering ' + src1 + "-" + id1);

        const video_url = videoURLFromData(src1, id1);

        if (this.props.geoloc)
            console.log(this.props.geoloc.country_code);

//        const thumbnail_url = LiveVideoThumbnailSourceMappings[src1].url + id1 + LiveVideoThumbnailSourceMappings[src1].extraPath;

        let content = "";
        let modal = "";
        let watchers = "";
        if (this.state.expanded) {
            content = <Modal centered visible={true} cancelText={"Close"} width={"100%"} height={"100%"}
                        onCancel={this.toggleExpanded.bind(this)}
                        okButtonProps={{style: {display: 'none'}}}
            >
                <LiveVideoPanel video={this.props.video} watchers={this.props.watchers} auth={this.props.auth}/>
            </Modal>
        }
        else {
            // watchers = <LiveVideoWatchers video={this.props.video} expanded={false}/>
            content = <Card title={this.props.video.get('title')} size="small" extra={<a href="#">Watch</a>} onClick={this.toggleExpanded.bind(this)}>
                    <iframe title={this.props.title} src={video_url} allowFullScreen/>
                    <div>Watching now: {this.state.count}</div>
                </Card>
        }
        return content
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