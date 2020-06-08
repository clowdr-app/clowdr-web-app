import React, {Component} from "react";
import {Space, Spin} from 'antd';
import GeoLocationLiveVideoThumbnail from "./VideoThumbnail";
import Parse from "parse";
import ParseLiveContext from "../parse/context";
import AuthUserContext from "../Session/context"

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
                    console.log("Found video " + found.title);
                    found.set("title", vid.get("title"));
                    found.set("src1", vid.get("src1"));
                    found.set("id1", vid.get("id1"));
                    found.set("src2", vid.get("src2"));
                    found.set("id2", vid.get("id2"));
                }
            });
        });

        let q = new Parse.Query("LiveVideoWatchers");
        q.find().then(res => {
            // console.log("WATCHERS: " + JSON.stringify(res));
            this.setState({
                watchers: res
            });
        });
        q.subscribe().then(subscription => {
            this.wactherSubscription = subscription;

            this.wactherSubscription.on('create', watchRecord => {
                console.log("New watcher " + JSON.stringify(watchRecord) + " " + watchRecord.get("user") + " " + watchRecord.get("video"));
                this.setState((prevState) => ({
                        watchers: [...prevState.watchers, watchRecord]
                }));
            })
            this.wactherSubscription.on('delete', watchRecord => {
                console.log("Watcher deleted " + watchRecord.get("user") + " " + watchRecord.get("video"));
                this.setState((prevState) => ({
                    watchers: prevState.watchers.filter((w)=>(
                        w.id != watchRecord.id
                    ))
                }));
            });
        });
    }

    componentWillUnmount() {
        if (this.sub)
            this.sub.unsubscribe();
        if (this.wactherSubscription)
            this.wactherSubscription.unsubscribe();
    }

    render() {
        if (this.state && this.state.videos && this.state.watchers) {
            return <div className={"space-align-container"}>
                {this.state.videos.map((video) => {
                    // let w = this.state.watchers.filter(w => w.video === video.id)
                    return <div className={"space-align-block"} key={video.get("key")}>
                        <Space align={"center"}>
                            <GeoLocationLiveVideoThumbnail auth={this.props.auth} video={video} watchers={this.state.watchers} />
                        </Space></div>
                })}
            </div>
        }
        return (
            <Spin tip="Loading...">
            </Spin>)
    }
}

const ParseLiveConsumer = (props) => (
    <ParseLiveContext.Consumer>
        {parseValue => (
            <AuthUserContext.Consumer>
                {value => (
                    <LiveStreaming {...props} auth={value} parseLive={parseValue}/>
                )}
            </AuthUserContext.Consumer>
        )
        }
    </ParseLiveContext.Consumer>
);

export default ParseLiveConsumer;
