import {NavLink} from "react-router-dom";
import React from "react";
import {Button, List, Skeleton, Tooltip} from "antd";
import BreakoutRoomDisplay from "../Lobby/BreakoutRoomDisplay"
import ProgramPersonDisplay from "./ProgramPersonDisplay";
import moment from "moment";
import ProgramSessionEvent from "../../classes/ProgramSessionEvent";

var timezone = require('moment-timezone');

export default class ProgramItemDisplay extends React.Component{
    constructor(props){
        super(props);
        this.state = {loading: true};
    }

    async componentDidMount() {
        let programItem = await this.props.auth.programCache.getProgramItem(this.props.id, this);
        if(!programItem){
            return;
        }
        if(programItem.get("events")){
            let events = programItem.get("events")
                .map((e)=>
                    this.props.auth?.programCache.getProgramSessionEvent(e.id, null));
            //@ts-ignore
            let evs = await Promise.all(events);
            let sessions = await Promise.all(evs.map((ev)=>
                            this.props.auth?.programCache.getProgramSession(ev.get("programSession").id, null)));
            this.setState({events: evs, sessions: sessions});
        }

        this.setState({
            ProgramItem: programItem,
            loading: false
        })
    }
    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramItem", this, this.props.id);
    }
    formatTime(timestamp) {
        return moment(timestamp).tz(timezone.tz.guess()).format('LLL z')
    }
    sortEvents(a, b){
        return a.get("startTime")< b.get("startTime") ? -1 : 1;
    }
    render() {
        if(this.state.loading){
            return <Skeleton.Input />
        }
        let authors = this.state.ProgramItem.get("authors") ? this.state.ProgramItem.get("authors") : [];
        let authorstr = "";
        let authorsArr = authors.map(a => <ProgramPersonDisplay key={a.id} auth={this.props.auth} id={a.id} />);
        if (authorsArr.length >= 1)
            authorstr= authorsArr.reduce((prev,curr) => [prev,", ",curr]);
        let sessionInfo;
        let now = Date.now();

        let className = "summaryProgramItem";
        if (this.props.event) {
            let session = this.props.event.get("programSession");
            let roomInfo;
            let startTime = this.props.event.get("startTime");
            let endTime = this.props.event.get("endTime");
            if (endTime < now) {
                className = "summaryProgramItem-past";
            } else if (startTime <= now && endTime >= now) {
                className = "summaryProgramItem-live";
            } else if (startTime > now) {
                className = "summaryProgramItem-future";
            }
        }
        if(this.state.sessions){
            let now = Date.now();

            sessionInfo = [];
            for(let event of this.state.events.sort(this.sortEvents)){
                let roomInfo;

                let session = this.state.sessions.find(s=>s.id==event.get("programSession").id);
                var timeS = session.get("startTime") ? session.get("startTime") : new Date();
                var timeE = session.get("endTime") ? session.get("endTime") : new Date();

                if (session.get("room")){ // && session.get("room").get("src1") == "YouTube") {
                    let when = "now"
                        roomInfo = <Button size="small" type="primary" onClick={() => {
                            this.props.auth.history.push("/live/" + when + "/" + session.get("room").get("name"))
                        }}>Go to session</Button>
                }
                sessionInfo.push(<List.Item key={event.id} style={{color: "white"}}>
                    <a href="#" onClick={()=>{
                        this.props.auth.history.push("/live/now/" + session.get("room").get("name"))
                    }
                    }>{session.get("title")} </a>({moment(event.get("startTime")).tz(timezone.tz.guess()).calendar()})
                </List.Item>);
            }
            sessionInfo = <List className="sessionListItem">
                {sessionInfo}
            </List>
        }
        else if(this.state.ProgramItem.get("programSession")){
            let session = this.state.ProgramItem.get("programSession");
            let roomInfo;
            let now = Date.now();
            var timeS = session.get("startTime") ? session.get("startTime") : new Date();
            var timeE = session.get("endTime") ? session.get("endTime") : new Date();

            if (session.get("room")){ // && session.get("room").get("src1") == "YouTube") {
                let when = "now"
                if(timeE >= now)
                    roomInfo = <div><b>Presentation room: </b><Button type="primary" onClick={() => {
                        this.props.auth.history.push("/live/" + when + "/" + session.get("room").get("name"))
                    }}>{session.get("room").get("name")}</Button></div>
                else
                    roomInfo = <div><b>Presentation room:</b> This session has ended.</div>
            }
            sessionInfo = <div>
                <b>Session:</b> {session.get("title")} ({this.formatTime(session.get("startTime"))} - {this.formatTime(session.get('endTime'))}){roomInfo}
            </div>;
        }

        let tooltip = <div>
            <b>{this.state.ProgramItem.get("title")}</b>
            <div><i>{authorstr}</i></div>
            {sessionInfo}
            {/*<p><b>Abstract: </b> {this.state.ProgramItem.get("abstract")}</p>*/}
            {(this.props.auth.user  && this.state.ProgramItem.get("breakoutRoom")) ?
                <p><b>Video Chat Room: </b>
                <Button onClick={()=>{
                this.props.auth.history.push("/breakoutRoom/" + this.state.ProgramItem.get("confKey"))
            }
                }>Join Video Chat Room</Button></p> : <></>}

        </div>
        if(this.props.hideLink)
            return <div className={"program-item-display "+ className}>
                <Tooltip placement="right" title={tooltip}>
                    <div className="text-indented">
                            {this.state.ProgramItem.get("title")}</div></Tooltip>
            </div>
        return <div className={"program-item-display "+ className}>
            <Tooltip placement="right" title={tooltip}><div className="text-indented"><NavLink  to={"/program/"+this.state.ProgramItem.get("confKey")}>{this.state.ProgramItem.get("title")}</NavLink></div></Tooltip>
            {this.props.showBreakoutRoom && this.state.ProgramItem.get("breakoutRoom") ? <BreakoutRoomDisplay id={this.state.ProgramItem.get("breakoutRoom").id} /> : <></>}
        </div>
    }
}