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
        let pwd = this.props.video.get("pwd1");
        this.video_url = videoURLFromData(src, id, pwd);

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
        if (!this.props.video.get("src1").includes("Zoom") ) {
            this.props.onExpand(this.props.video);
            this.setState({"expanded": !this.state.expanded});
        }
    }

    render() {
        if (!this.props.geoloc) {
            return (
                <Spin tip="Loading...">
                </Spin>)
    
        }

        let isLight = false;
        let link = "#";
        let target = "";
        let rel=""
        if (this.props.video.get("src1").includes("Zoom")) {
            console.log("LIGHT!");
            isLight = true;
            link = this.video_url;
            target = "_blank";
            rel="noopener noreferrer";
        }
        let thumbnail = <ReactPlayer playing playsinline light={isLight} controls={true} playIcon={<img src="preview-unavailable.png" width={260}/>} 
                        muted={true} volume={1} width={360} height={180} url={this.video_url}/>

        return <Card title={this.props.video.get('title')} size="small" extra={<a href={link} target={target} rel={rel}>Watch</a>} onClick={this.toggleExpanded.bind(this)}>
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