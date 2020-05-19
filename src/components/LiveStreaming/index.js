import React, {Component} from "react";
import {withFirebase} from '../Firebase';
import {Space, Spin} from 'antd';
import VideoThumbnail from "./VideoThumbnail";


class LiveStreaming extends Component {
    componentDidMount() {
        this.props.firebase.db.ref("liveVideos/").on('value', val => {
            const res = val.val();
            if(res) {
                const videos = [];
                val.forEach((vid) => {
                    videos.push({id: vid.key, data: vid.val()});
                });
                this.setState({videos: videos});
            }
        });
    }


    render() {
        if (this.state && this.state.videos) {
            return <div className={"space-align-container"}>
                {this.state.videos.map((video) => {
                    return <div className={"space-align-block"} key={video.id}>
                        <Space align={"center"}>
                            <VideoThumbnail video={video}/>
                        </Space></div>
                })}
            </div>
        }
        return (
            <Spin tip="Loading...">
            </Spin>)
    }
}

export default withFirebase(LiveStreaming);