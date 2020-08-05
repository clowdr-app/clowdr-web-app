import React, {Component} from "react";
import {Spin} from 'antd';
import moment from 'moment';
import LiveStreamingPanel from "./LiveStreamingPanel";
import ZoomPanel from "./ZoomPanel";
import AuthUserContext from "../Session/context";

class LiveStreaming extends Component {
    constructor(props) {
        // props.parseLive
        console.log("Created a livestreaming")
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
            upcomingRooms: [],
            currentSessions: [],
            upcomingSessions: [],
            loggedIn: (this.props.auth.user ? true : false)
        };

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

    getLiveRooms(when, sessions) {
        if(!sessions)
            sessions = this.state.ProgramSessions;
        if(!sessions)
            throw "No session data!"
        let now = Date.now();

        // Live now
        let currentSessions = sessions.filter(s => {
            var timeS = s.get("startTime") ? s.get("startTime") : new Date();
            var timeE = s.get("endTime") ? s.get("endTime") : new Date();
            if (when == "past") {
                return (s.get("room") && now >= moment(timeE).add(10, 'm').toDate().getTime());
            }
            else { // live sessions
                return (now >= moment(timeS).subtract(30, 'm').toDate().getTime() && 
                        now <= moment(timeE).add(10, 'm').toDate().getTime() && s.get("room"));
            }
        }).sort(this.dateSorter);
        let liveRooms = [];
        if (currentSessions) {
            currentSessions.map(s => liveRooms.push(s.get("room")));
        }
        else
            console.log('No current sessions');

        liveRooms = liveRooms.reduce((acc, room) => acc.find(r => r && room && r.id == room.id) ? acc : [...acc, room], []); // remove duplicates
        liveRooms.sort((a, b) => (a.get("name") == "Practice Room" ? 1
            : b.get("name") == "Practice Room" ? -1 : a.get('name').localeCompare(b.get('name'))));

        // Upcoming
        let upcomingSessions = []
        let upcomingRooms = [];
        if (when == "now") {
            upcomingSessions = sessions.filter(s => {
                var timeS = s.get("startTime") ? s.get("startTime") : new Date();
                let ts_window = moment(timeS).subtract(30, 'd').toDate().getTime();
                return (timeS > now && ts_window < now && s.get("room"));
            }).sort(this.dateSorter);

            if (upcomingSessions.length == 0) {
                // Widen the time window
                upcomingSessions = sessions.filter(s => {
                    var timeS = s.get("startTime") ? s.get("startTime") : new Date();
                    let ts_window = moment(timeS).subtract(24, 'h').toDate().getTime();
                    return (timeS > now && ts_window < now && s.get("room"));
                }).sort(this.dateSorter);
    
            }

            if (upcomingSessions.length > 0) {
                upcomingSessions.map(s => upcomingRooms.push(s.get("room")));
            }
            else
                console.log('No upcoming sessions');

            upcomingRooms = upcomingRooms.reduce((acc, room) => acc.find(r => r && room && r.id == room.id) ? acc : [...acc, room], []); // remove duplicates
            // upcomingRooms.sort((a, b) => a.get('name').localeCompare(b.get('name')));
            // console.log('--> Upcoming rooms: ' + upcomingRooms.length);
        }

        return [liveRooms, currentSessions, upcomingRooms, upcomingSessions];
    }
    
    async componentDidMount() {
        let user = undefined;

        if (!this.state.loggedIn) {
            user = await this.props.auth.refreshUser();
            if (user) {
                this.setState({
                    loggedIn: true
                }); 
            }
        }

        let sessions = await this.props.auth.programCache.getProgramSessions(this);
        if (this.props.auth.user) {

            let current = this.getLiveRooms(this.props.match.params.when, sessions);
            this.setState({
                liveRooms: current[0],
                currentSessions: current[1],
                upcomingRooms: current[2],
                upcomingSessions: current[3],
            });

            // Run every 15 minutes that the user is on this page
            this.timerId = setInterval(() => {
    //            console.log('TICK!');
                let current = this.getLiveRooms(this.props.match.params.when);
                if (!this.arraysEqual(current[0], this.state.liveRooms)) {
                    this.setState({
                        liveRooms: current[0], 
                        currentSessions: current[1],
                        upcomingRooms: current[2],
                        upcomingSessions: current[3],
                    });
                }
            }, 60000*15);
    
        }
        if (this.props.match && this.props.match.params.roomName){
            this.expandVideoByName(this.props.match.params.roomName);
        }
        this.setState({loading: false});
    }

    componentWillUnmount() {
        this.props.auth.helpers.setExpandedProgramRoom(null);
        clearInterval(this.timerId);
    }

    toggleExpanded(vid) {
        // this.setState({
        //     expanded: !this.state.expanded,
        //     expanded_video: (this.state.expanded ? undefined: vid)
        // });
        if (this.props.match.params.roomName){
            this.expandVideoByName(null);
            this.props.history.push("/live/"+this.props.match.params.when)
        }
        else if (vid)
            this.props.history.push("/live/"+this.props.match.params.when+"/"+vid.get("name"))
    }

    componentDidUpdate(prevProps) {
        if (prevProps.match.params.when != this.props.match.params.when) {
            if (this.state.expanded) {
                this.toggleExpanded();
            }
            let current = this.getLiveRooms(this.props.match.params.when);
            this.setState({
                liveRooms: current[0],
                currentSessions: current[1],
                upcomingRooms: current[2],
                upcomingSessions: current[3]
            })
        }
        if (this.props.match && this.props.match.params.roomName) {
            this.expandVideoByName(this.props.match.params.roomName);
        } else {
            if (this.state.expanded) {
                this.setState({expanded: false, expanded_video: null, expandedRoomName: null})
            }
            this.props.auth.setSocialSpace("Lobby");

        }
    }
    expandVideoByName(roomName){
        if(!this.state.expandedRoomName || !this.state.expanded || roomName != this.state.expandedRoomName){
           let room = this.state.rooms.find(r=>(r.get("name") == roomName));
            if(!room)
                room = this.state.liveRooms.find(r=>(r.get("name") == roomName)); //I don't understand why we have rooms vs liveRooms...
            if(!room)
                room = this.state.upcomingRooms.find(r=>(r.get("name") == roomName));//...?
           if(room){
               // if(this.props.match.params.when == "now" && room.get("qa")){
                   this.props.auth.helpers.setExpandedProgramRoom(room);
               // }
               this.setState({expanded: true, expanded_video: room, expandedRoomName: roomName})
               window.scrollTo(0, 0);

           }
        }
    }
    render() {
        if(this.state.loading){
            return <Spin />
        }
        if (!this.state.loggedIn) {
            return <div>You don't have access to this page unless you are signed in. Please log in.</div>
        }

        let header = "";
        let upcoming = ""
        if (!this.state.expanded && this.props.match.params.when == "now") {
            header = <h3>Happening now:</h3>
            upcoming = <div><h3>Upcoming:</h3>
                <div className={"space-align-container"}>
                    {this.state.upcomingRooms.map((room) => {
                        
                        let mySessions = this.state.upcomingSessions.filter(s => s.get("room").id === room.id);
                        let width = 320;
                        if (!room.get("src1")) {
                            // // return <div className={"space-align-block"} key={room.id} style={{width:width}}>
                            //     <NoMediaPanel auth={this.props.auth} video={room} vid={this.state.expanded_video} mysessions={mySessions} />
                        // </div>
                            return "";
                        }
                        return <React.Fragment key={room.id}>
                            <div className={"space-align-block"} key={room.id} style={{width:width}}>
                                <LiveStreamingPanel auth={this.props.auth} expanded={this.state.expanded} video={room} mysessions={mySessions} when={this.props.match.params.when}
                                                    playing={false}
                                                    onExpand={this.toggleExpanded.bind(this,
                                room)}/>
                            </div>
                            </React.Fragment> 
                            
                    })}
                </div> 

            </div>
        }
        if (!this.state.expanded && this.props.match.params.when == "past") {
            header = <h3>Past live sessions:</h3>
        }

        let rooms = this.state.liveRooms;
        if (this.state.expanded) {
            rooms = rooms.concat(this.state.upcomingRooms).filter(r => r.id == this.state.expanded_video.id);
            if (rooms.length > 1)
                rooms = [rooms[0]];
        }
        return <div>{header}
            <div className={"space-align-container"}>
                {rooms.map((room) => {

                    let mySessions = this.state.currentSessions.filter(s => s.get("room").id === room.id);
                    if (mySessions.length == 0)
                        mySessions = this.state.upcomingSessions.filter(s => s.get("room").id === room.id); //TODO why are future/current separate datastructures?
                    let qa = "";
                    let width = "100%";
                    if (!this.state.expanded) width = 320;
                    // if (this.state.expanded && room.id == this.state.expanded_video.id) {
                    //     if (this.props.match.params.when =="now") {
                    //         const q_url = this.state.expanded_video.get("qa");
                    //         qa = q_url ? <table><tbody><tr><td style={{"textAlign":"center"}}><strong>Live questions to the speakers</strong></td></tr>
                    //             <tr><td><iframe title={this.state.expanded_video.get("name")} src={q_url} style={{"height":"720px"}} allowFullScreen/> </td></tr>
                    //             </tbody></table> : "";
                    //     }
                    // }

                    if (!room.get("src1")) {
                        // return <div className={"space-align-block"} key={room.id} style={{width:width}}>
                        //     <NoMediaPanel auth={this.props.auth} video={room} vid={this.state.expanded_video} mysessions={mySessions} />
                        // </div>
                        return ""

                    }

                    // if (room.get("src1").includes("Zoom")) {
                    //     return <div className={"space-align-block"} key={room.id} style={{width:width}}>
                    //         <ZoomPanel auth={this.props.auth} video={room} vid={this.state.expanded_video} mysessions={mySessions} watchers={this.state.watchers} />
                    //     </div>
                    // }

                    if (this.state.expanded && room.id !== this.state.expanded_video.id) {
                        return ""
                    } else
                        return <React.Fragment key={room.id}>
                            <div className={"space-align-block"} key={room.id} style={{width: width}}>
                                <LiveStreamingPanel
                                    playing={this.state.expanded}
                                    auth={this.props.auth} expanded={this.state.expanded} video={room}
                                    mysessions={mySessions} when={this.props.match.params.when}
                                    onExpand={this.toggleExpanded.bind(this,
                                        room)}/>
                            </div>
                            <div className={"space-align-block"}>{qa}</div>
                        </React.Fragment>

                })}
            </div>
            {upcoming}
        </div>
    }
}

const LiveVideosArea = (props) => (
            <AuthUserContext.Consumer>
                {value => (
                    <LiveStreaming {...props} auth={value} />
                )}
            </AuthUserContext.Consumer>
);

export default LiveVideosArea;
