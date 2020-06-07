import React, {Component} from "react";
import {Space, Spin} from 'antd';
import GeoLocationLiveVideoThumbnail from "./VideoThumbnail";
import Parse from "parse";
import ParseLiveContext from "../parse/context";

class LiveStreaming extends Component {
    constructor(props) {
        // props.parseLive
        super(props);
        this.state = {
            dirty: false,
            updating: false
        };
    }
    
    componentDidMount() {
        let query = new Parse.Query("LiveVideo");
        query.find().then(res => {
            this.setState({
                videos: res,
                loading: false
            });
            this.sub = this.props.parseLive.subscribe(query);
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
            console.log(JSON.stringify(res));
            this.setState({
                watchers: res
            });
        });
        q.subscribe().then(subscription => {
            this.wactherSubscription = subscription;

            this.wactherSubscription.on('update', watchRecord => {
                console.log("Update received: watchers count for " + watchRecord.get("name") + " is now " + watchRecord.get("count"));
                console.log(JSON.stringify(watchRecord));
                if (!this.state.updating) {
                    const found = this.state.watchers.find(w => w.objectId === watchRecord.objectId);
                    if (found) {
                        console.log("Found watcher ");
                        found.set("count", watchRecord.get("count"));
                        this.setState({dirty: !this.state.dirty});
                    }
                    else
                        console.log("VideoWatcher not found locally: " + watchRecord.get("name"));
                    this.setState({updating: false});
                }
                else
                    console.log("Local update: ignoring " + watchRecord.get("count"));
            });
        });
    }

    componentWillUnmount() {
        if (this.sub)
            this.sub.unsubscribe();
        if (this.wactherSubscription)
            this.wactherSubscription.unsubscribe();
    }

    onUpdate() {
        this.setState({updating: true});
    }

    render() {
        if (this.state && this.state.videos && this.state.watchers) {
            return <div className={"space-align-container"}>
                {this.state.videos.map((video) => {
                    let w = this.state.watchers.find(w => w.get("name") === video.get("title"))
                    return <div className={"space-align-block"} key={video.get("key")}>
                        <Space align={"center"}>
                            <GeoLocationLiveVideoThumbnail video={video} watchers={w} dirty={this.state.dirty} onUpdate={this.onUpdate.bind(this)}/>
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
