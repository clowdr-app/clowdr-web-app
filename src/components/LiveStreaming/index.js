import React, {Component} from "react";
import {Space, Spin} from 'antd';
import GeoLocationLiveVideoThumbnail from "./VideoThumbnail";
import Parse from "parse";
import ParseLiveContext from "../parse/context";

class LiveStreaming extends Component {
    constructor(props) {
        // props.parseLive
        super(props);
    }
    
    componentDidMount() {
        let query = new Parse.Query("LiveVideo");
        query.find().then(res => {
            this.setState({
                videos: res,
                loading: false
            });
            this.sub = this.props.parseLive.client.subscribe(query);
            this.sub.on('create', vid => {
                console.log("Video created " + JSON.stringify(vid) + " " + vid.get("title") + " " + vid.title);
                this.setState((prevState) => ({
                        videos: [...prevState.videos, vid]
                }))
            })
            this.sub.on('delete', vid=>{
                console.log("Video deleted " + vid.get("title"));
                this.setState((prevState)=> ({
                    videos: prevState.videos.filter((v)=>(
                        v.id != vid.id
                    ))
                }));
            });
            this.sub.on('update', vid=>{
                console.log("Video updated " + vid.get("title"));
                const found = this.state.videos.find(v => v.objectId === vid.objectId);
                if (found) {
                    console.log("Found it ");
                    found.set("title", vid.get("title"));
                    found.set("src1", vid.get("src1"));
                    found.set("id1", vid.get("id1"));
                    found.set("src2", vid.get("src2"));
                    found.set("id2", vid.get("id2"));
                }
            });
        });

    }

    componentWillUnmount() {
        if (this.sub)
            this.sub.unsubscribe();
    }


    render() {
        if (this.state && this.state.videos) {
            return <div className={"space-align-container"}>
                {this.state.videos.map((video) => {
                    return <div className={"space-align-block"} key={video.get("key")}>
                        <Space align={"center"}>
                            <GeoLocationLiveVideoThumbnail video={video}/>
                        </Space></div>
                })}
            </div>
        }
        return (
            <Spin tip="Loading...">
            </Spin>)
    }
}

const ParseLiveConsuemr = (props) => (
    <ParseLiveContext.Consumer>
        {value => (
            <LiveStreaming {...props} parseLive={value}/>
        )}
    </ParseLiveContext.Consumer>
);

export default ParseLiveConsuemr;
