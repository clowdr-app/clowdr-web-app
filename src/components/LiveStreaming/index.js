import React, {Component} from "react";
import {Button, Space, Spin} from 'antd';
import moment from 'moment';
import LiveStreamingPanel from "./LiveStreamingPanel";
import ZoomPanel from "./ZoomPanel";
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

        // Run every 15 minutes that the user is on this page
        this.timerId = setInterval(() => {
//            console.log('TICK!');
            let rooms = this.getLiveRooms();
            if (!this.arraysEqual(rooms, this.state.liveRooms))
                this.setState({liveRooms: this.getLiveRooms()});
        }, 60000*1);
    }

    arraysEqual(arr1,arr2) { // Assumes they are already sorted
        if (!Array.isArray(arr1) || ! Array.isArray(arr2) || arr1.length !== arr2.length)
          return false;    
        // var arr1 = _arr1.concat().sort();
        // var arr2 = _arr2.concat().sort();
    
        for (var i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i])
                return false;    
        }
    
        return true;
    
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
        liveRooms.sort((a, b) => a.get('name').localeCompare(b.get('name')));

        liveRooms.map(r => console.log('Live @ ' + r.get('name')));
        return liveRooms;
    }
    
    componentDidMount() {
    }

    componentWillUnmount() {
        clearInterval(this.timerId);
    }

    toggleExpanded(vid) {
        console.log('[Live]: --> ' + this.state.expanded);
        this.setState({
            expanded: !this.state.expanded,
            expanded_video: (this.state.expanded ? undefined: vid)
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

            return <div className={"space-align-container"}>
                    {this.state.liveRooms.map((room) => {
                        let qa = "";
                        let width = 0;
                        if (!this.state.expanded) width = 320;
                        if (this.state.expanded && room.id == this.state.expanded_video.id) {
                            width = 1000;
                            const q_url = this.state.expanded_video.get("qa");
                            qa = <iframe title={this.state.expanded_video.get("name")} src={q_url} style={{"height":"720px"}} allowFullScreen/>            
                        }
                        
                        if (room.get("src1").includes("Zoom")) {
                            return <div className={"space-align-block"} key={room.id} style={{width:width}}>
                                <ZoomPanel auth={this.props.auth} video={room} vid={this.state.expanded_video} watchers={this.state.watchers} />
                            </div>
                        }

                        return <React.Fragment key={room.id}>
                                <div className={"space-align-block"} key={room.id} style={{width:width}}>
                                    <LiveStreamingPanel auth={this.props.auth} video={room} vid={this.state.expanded_video} watchers={this.state.watchers} onExpand={this.toggleExpanded.bind(this)}/>
                                </div>
                                <div className={"space-align-block"}>{qa}</div>   
                                </React.Fragment> 
                    })}
                </div> 
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
