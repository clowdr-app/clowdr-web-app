import React, {Component} from "react";
import {Spin} from 'antd';
import moment from 'moment';
import LiveStreamingPanel from "./LiveStreamingPanel";
import ZoomPanel from "./ZoomPanel";
import NoMediaPanel from "./NoMediaPanel";
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
            liveRooms: [],
            currentSessions: []
        };

        console.log('[Live]: downloaded? ' + this.props.downloaded);

        // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else {
            this.state.rooms = this.props.rooms;
            this.state.sessions = this.props.sessions;
            let current = this.getLiveRooms();
            this.state.liveRooms = current[0];
            this.state.currentSessions = current[1];
        }

        // Run every 15 minutes that the user is on this page
        this.timerId = setInterval(() => {
//            console.log('TICK!');
            let current = this.getLiveRooms();
            if (!this.arraysEqual(current[0], this.state.liveRooms)) {
                this.setState({liveRooms: current[0], currentSessions: current[1]});
            }
        }, 60000*15);
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

    dateSorter(a, b) {
        var timeA = a.get("startTime") ? a.get("startTime") : new Date();
        var timeB = b.get("startTime") ? b.get("startTime") : new Date();
        return timeA > timeB;
    }

    getLiveRooms() {
        let now = Date.now();
        let currentSessions = this.props.sessions.filter(s => {
            var timeS = s.get("startTime") ? s.get("startTime") : new Date();
            var timeE = s.get("endTime") ? s.get("endTime") : new Date();
            return (now >= moment(timeS).subtract(30, 'm').toDate().getTime() && 
                    now <= moment(timeE).add(30, 'm').toDate().getTime())
        }).sort(this.dateSorter);

        let liveRooms = [];
        if (currentSessions) {
            currentSessions.map(s => liveRooms.push(s.get("room")));
        }
        else
            console.log('No current sessions');

        liveRooms = liveRooms.reduce((acc, room) => acc.find(r => r.id == room.id) ? acc : [...acc, room], []); // remove duplicates

        liveRooms.sort((a, b) => a.get('name').localeCompare(b.get('name')));

        liveRooms.map(r => console.log('Live @ ' + r.get('name')));
        return [liveRooms, currentSessions];
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

        if (this.state.loading) {
            if (this.state.gotRooms && this.state.gotSessions) {
                console.log('[Live]: Program download complete');
                let current = this.getLiveRooms();
                this.setState({
                    rooms: this.props.rooms,
                    sessions: this.props.sessions,
                    liveRooms: current[0],
                    currentSessions: current[1],
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
    }
    
    render() {
        if (this.props.downloaded) {

            return <div className={"space-align-container"}>
                    {this.state.liveRooms.map((room) => {
                        let mySessions = this.state.currentSessions.filter(s => s.get("room").id === room.id);
                        let qa = "";
                        let width = 0;
                        if (!this.state.expanded) width = 320;
                        if (this.state.expanded && room.id == this.state.expanded_video.id) {
                            width = 1000;
                            const q_url = this.state.expanded_video.get("qa");
                            qa = q_url ? <iframe title={this.state.expanded_video.get("name")} src={q_url} style={{"height":"720px"}} allowFullScreen/> : "";     
                        }
                        
                        if (!room.get("src1")) {
                            return <div className={"space-align-block"} key={room.id} style={{width:width}}>
                                <NoMediaPanel auth={this.props.auth} video={room} vid={this.state.expanded_video} mysessions={mySessions} />
                        </div>
                        }

                        if (room.get("src1").includes("Zoom")) {
                            return <div className={"space-align-block"} key={room.id} style={{width:width}}>
                                <ZoomPanel auth={this.props.auth} video={room} vid={this.state.expanded_video} mysessions={mySessions} watchers={this.state.watchers} />
                            </div>
                        }

                        return <React.Fragment key={room.id}>
                                <div className={"space-align-block"} key={room.id} style={{width:width}}>
                                    <LiveStreamingPanel auth={this.props.auth} video={room} vid={this.state.expanded_video} mysessions={mySessions} watchers={this.state.watchers} onExpand={this.toggleExpanded.bind(this)}/>
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
        {({rooms, tracks, items, sessions, people, onDownload, downloaded}) => (
            <AuthUserContext.Consumer>
                {value => (
                    <LiveStreaming {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} onDown={onDownload} downloaded={downloaded}/>
                )}
            </AuthUserContext.Consumer>
        )}
    </ProgramContext.Consumer>
);

export default LiveVideosArea;
