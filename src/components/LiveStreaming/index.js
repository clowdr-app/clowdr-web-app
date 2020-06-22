import React, {Component} from "react";
import {Button, Space, Spin} from 'antd';
import moment from 'moment';
import LiveVideoThumbnail from "./VideoThumbnail";
import LiveVideoPanel from "./LiveVideoPanel";
import Parse from "parse";
import AuthUserContext from "../Session/context";
import {ProgramContext} from "../Program";

class LiveStreaming extends Component {
    constructor(props) {
        // props.parseLive
        super(props);
        this.state = {
            expanded: false,
            loading: true, 
            videos: [],
            watchers: [],
            sessions: [],
            rooms: [],
            gotSessions: false,
            gotRooms: false,
            liveRooms: []
        };

        console.log('[Live]: downloaded? ' + this.props.downloaded);

        // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else {
            this.state.rooms = this.props.rooms;
            this.state.sessions = this.props.sessions;
            this.state.liveRooms = this.getLiveRooms()
        }
    }

    getLiveRooms() {
        let now = Date.now();
        let currentSessions = this.props.sessions.filter(s => 
            now >= moment(s.get("startTime")).subtract(30, 'm').toDate().getTime() && 
            now <= moment(s.get("endTime")).add(30, 'm').toDate().getTime()
        );
        let liveRooms = [];
        if (currentSessions) {
            currentSessions.map(s => liveRooms.push(s.get("room")));
        }
        else
            console.log('No current sessions');
        liveRooms = Array.from(new Set(liveRooms)); // remove duplicates
        liveRooms.map(r => console.log('Live @ ' + r.get('name')));
        return liveRooms;
    }
    
    componentDidMount() {
        // let query = new Parse.Query("LiveVideo");
        // query.find().then(res => {
        //     this.setState({
        //         videos: res,
        //         loading: false
        //     });
        // });
        // query.subscribe().then(sub => {
        //     this.sub = sub;
        //     this.sub.on('create', vid => {
        //         console.log("Video created " + JSON.stringify(vid) + " " + vid.get("title") + " " + vid.title);
        //         this.setState((prevState) => ({
        //                 videos: [...prevState.videos, vid]
        //         }))
        //     })
        //     this.sub.on('delete', vid=>{
        //         console.log("Video deleted " + vid.get("title"));
        //         this.setState((prevState)=> ({
        //             videos: prevState.videos.filter((v)=>(
        //                 v.id != vid.id
        //             ))
        //         }));
        //     });
        //     this.sub.on('update', vid=>{
        //         console.log("Video updated " + vid.get("title"));
        //         const found = this.state.videos.find(v => v.objectId === vid.objectId);
        //         if (found) {
        //             console.log("Found video " + found.title);
        //             found.set("title", vid.get("title"));
        //             found.set("src1", vid.get("src1"));
        //             found.set("id1", vid.get("id1"));
        //             found.set("src2", vid.get("src2"));
        //             found.set("id2", vid.get("id2"));
        //         }
        //     });
        // });

        // let q = new Parse.Query("LiveVideoWatchers");
        // q.find().then(res => {
        //     // console.log("WATCHERS: " + JSON.stringify(res));
        //     this.setState({
        //         watchers: res
        //     });
        // });
        // q.subscribe().then(subscription => {
        //     this.wactherSubscription = subscription;

        //     this.wactherSubscription.on('create', watchRecord => {
        //         console.log("New watcher " + JSON.stringify(watchRecord) + " " + watchRecord.get("user") + " " + watchRecord.get("video"));
        //         this.setState((prevState) => ({
        //                 watchers: [...prevState.watchers, watchRecord]
        //         }));
        //     })
        //     this.wactherSubscription.on('delete', watchRecord => {
        //         console.log("Watcher deleted " + watchRecord.get("user") + " " + watchRecord.get("video"));
        //         this.setState((prevState) => ({
        //             watchers: prevState.watchers.filter((w)=>(
        //                 w.id != watchRecord.id
        //             ))
        //         }));
        //     });
        // });
    }

    componentWillUnmount() {
        if (this.sub)
            this.sub.unsubscribe();
        if (this.wactherSubscription)
            this.wactherSubscription.unsubscribe();
    }

    toggleExpanded(vid) {
        console.log('--> ' + this.state.expanded);
        this.setState({
            expanded: !this.state.expanded,
            expanded_video: vid
        });
    }

    componentDidUpdate(prevProps) {
        console.log("[Live]: Something changed");

        if (this.state.loading) {
            if (this.state.gotRooms && this.state.gotSessions) {
                console.log('[Live]: Program download complete');
                this.setState({
                    rooms: this.props.rooms,
                    sessions: this.props.sessions,
                    liveRooms: this.getLiveRooms(),
                    loading: false
                });
            }
            else {
                console.log('[Live]: Program still downloading...');
                if (prevProps.rooms.length != this.props.rooms.length) {
                    this.setState({gotRooms: true});
                    console.log('[Live]: got rooms');
                }
                if (prevProps.sessions.length != this.props.sessions.length) {
                    this.setState({gotSessions: true});
                    console.log('[Live]: got sessions');
                }
            }
        }
        else 
            console.log('[Live]: Program cached');
    }
    
    render() {
        if (this.props.downloaded) {
            if (!this.state.expanded) {
                return <div className={"space-align-container"}>
                    {this.state.liveRooms.map((room) => {
                        // let w = this.state.watchers.filter(w => w.video === video.id)
                        return <div className={"space-align-block"} key={room.id}>
                            <Space align={"center"}>
                                <LiveVideoThumbnail auth={this.props.auth} video={room} watchers={this.state.watchers} onExpand={this.toggleExpanded.bind(this)}/>
                            </Space></div>
                    })}
                </div>
            }
            else {
                return <div>
                    <Button type="link" href="#" onClick={this.toggleExpanded.bind(this)}>Go Back</Button>
                    <LiveVideoPanel video={this.state.expanded_video} watchers={this.state.watchers} auth={this.props.auth} geoloc={this.props.geoloc}/>
                    </div>
            }
        
            
        }
        return (
            <Spin tip="Loading...">
            </Spin>)
    }
}

const LiveVideosArea = (props) => (
    <ProgramContext.Consumer>
        {({rooms, tracks, items, sessions, onDownload, downloaded}) => (
            <AuthUserContext.Consumer>
                {value => (
                    <LiveStreaming {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>
);

export default LiveVideosArea;
