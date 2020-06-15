import React from 'react';
import LiveVideoPanel from "./LiveVideoPanel";
import {Modal, Card, Spin} from "antd";
import GeoLocationContext from '../GeoLocation/context';
import {videoURLFromData} from './utils'
import ReactPlayer from 'react-player';

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

        let src = this.props.video.get("src1");
        let id = this.props.video.get("id1");
        this.video_url = videoURLFromData(src, id);

        // if (this.props.geoloc.country_code.toLowerCase() == 'cn')
        // {
        //     console.log("Viewer from China! Nǐ hǎo");
        //     src = this.props.video.get("src2");
        //     id = this.props.video.get("id2");
        //     this.video_url = videoURLFromData(src, id);
        // }
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
        this.props.onExpand(this.props.video);
        this.setState({"expanded": !this.state.expanded});
    }

    render() {
        if (!this.props.geoloc) {
            return (
                <Spin tip="Loading...">
                </Spin>)
    
        }

        let thumbnail = <ReactPlayer playing playsinline controls={true} muted={true} volume={1} width={360} height={180} url={this.video_url}/>

        return <Card title={this.props.video.get('title')} size="small" extra={<a href="#">Watch</a>} onClick={this.toggleExpanded.bind(this)}>
                    {thumbnail}
                    <div>Watching now: {this.state.count}</div>
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