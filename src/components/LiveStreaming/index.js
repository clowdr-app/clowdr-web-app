import React, {Component} from "react";
import {Space, Spin} from 'antd';
import GeoLocationLiveVideoThumbnail from "./VideoThumbnail";
import Parse from "parse";
import ParseLiveContext from "../parse/context";


class LiveStreaming extends Component {
    componentDidMount() {
        let query = new Parse.Query("LiveVideo");
        query.find().then(res => {
            this.setState({
                videos: res,
                loading: false
            });
            this.sub = this.props.parseLive.subscribe(query);
            this.sub.on('create', vid => {
                this.setState((prevState) => ({
                        videos: [vid, ...prevState.videos]
                }))
            })
            this.sub.on("delete", vid=>{
                this.setState((prevState)=> ({
                    videos: prevState.videos.filter((v)=>(
                        v.id != vid.id
                    ))
                }));
            });
        })
    }
    componentWillUnmount() {
        if(this.sub)
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
