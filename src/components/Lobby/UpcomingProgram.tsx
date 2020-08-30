import React from 'react';
import { NavLink } from "react-router-dom";
import { ClowdrState } from "../../ClowdrTypes";
import ProgramSession from "../../classes/ProgramSession"
import { Collapse, Divider, Spin, Button } from "antd";
import { AuthUserContext } from '../Session';
import ExpandableSessionDisplay from "./ExpandableSessionDisplay"
import moment from "moment";
import ProgramSessionEvent from "../../classes/ProgramSessionEvent";
import ProgramSessionEventDisplay from "../Program/ProgramSessionEventDisplay";
import ProgramTrack from "../../classes/ProgramTrack";
import { startTImeOffsetForProgramDisplay } from "../../globals";

interface UpcomingProgramProps {
    auth: ClowdrState | null;
}

interface UpcomingProgramState {
    loading: boolean,
    ProgramSessions: ProgramSession[],
    curItems: (ProgramSession | ProgramSessionEvent)[],
    ProgramSessionEvents: ProgramSessionEvent[],
    ProgramTracks: ProgramTrack[],
    nextUpdateTime: moment.Moment
}

class UpcomingProgram extends React.Component<UpcomingProgramProps, UpcomingProgramState> {
    private updateTimer?: number;
    private currentProgramTimeRef: React.RefObject<any>;
    private lastRenderedNow?: Date;
    private lastScrolledNow?: Date;
    constructor(props: UpcomingProgramProps) {
        super(props);
        this.currentProgramTimeRef = React.createRef();
        this.state = {
            loading: true,
            ProgramSessions: [],
            ProgramSessionEvents: [],
            ProgramTracks: [],
            curItems: [],
            nextUpdateTime: moment().add(1, "hour")
        }
    }

    componentDidMount(): void {
        Promise.all([this.props.auth?.programCache.getProgramSessions(this), this.props.auth?.programCache.getProgramSessionEvents(this),
        this.props.auth?.programCache.getProgramTracks(this)])
            .then(([sessions, events, tracks]) => {
                //find the next time we should update
                this.setState({
                    ProgramSessions: sessions,
                    ProgramSessionEvents: events,
                    ProgramTracks: tracks,
                    nextUpdateTime: this.getNextUpdateTime(sessions)
                });
            });
    }

    componentDidUpdate(prevProps: Readonly<UpcomingProgramProps>, prevState: Readonly<UpcomingProgramState>, snapshot?: any): void {
        if (this.state.ProgramSessions !== prevState.ProgramSessions || this.state.ProgramSessionEvents !== prevState.ProgramSessionEvents) {
            this.updateCurrentSessions();
        }

        if (this.lastRenderedNow !== this.lastScrolledNow) {
            this.lastScrolledNow = this.lastRenderedNow;
            this.scrollToNow();
        }
        if (!this.state.nextUpdateTime.isSame(prevState.nextUpdateTime)) {
            if (this.updateTimer) {
                window.clearTimeout(this.updateTimer);
            }
            let timeout = this.state.nextUpdateTime.valueOf() - moment().valueOf();
            if (timeout < 0)
                timeout = 0 - timeout;
            this.updateTimer = window.setTimeout(this.updateCurrentSessions.bind(this), timeout);
        }
    }

    componentWillUnmount(): void {
        this.props.auth?.programCache.cancelSubscription("ProgramSession", this);
        this.props.auth?.programCache.cancelSubscription("ProgramSessionEvent", this);
        this.props.auth?.programCache.cancelSubscription("ProgramTrack", this);
    }

    sessionView(sessions: ProgramSession[], title: string) {
        // if(sessions.length === 0){
        //     return <></>
        // }
        let items = [];
        let lastFormattedTime = null;

        for (let session of sessions.sort(this.dateSorter)) {
            let formattedTime = moment(session.get("startTime")).calendar();
            if (title === "Live")
                formattedTime = "Until " + moment(session.get("endTime")).calendar();
            if (!session)
                continue;
            if (formattedTime !== lastFormattedTime) {
                items.push(<div key={"timeStamp" + session.id}>{formattedTime}</div>)
            }
            lastFormattedTime = formattedTime;
            items.push(<ExpandableSessionDisplay session={session} key={session.id} isLive={title === "Live"} />)
        }
        return <Collapse.Panel header={title} key={title}>
            {items}
        </Collapse.Panel>
    }

    dateSorter(a: ProgramSession | ProgramSessionEvent, b: ProgramSession | ProgramSessionEvent) {
        let now = new Date().getTime();
        var timeA = a.get("startTime") ? a.get("startTime").getTime() : now;
        var timeB = b.get("startTime") ? b.get("startTime").getTime() : now;
        if (timeA === timeB && b.get("endTime") && a.get("endTime")) {
            timeA = a.get("endTime").getTime();
            timeB = b.get("endTime").getTime();
        }
        return timeA > timeB ? 1 : timeA === timeB ? a.id.toString().localeCompare(b.id.toString()) : -1;
    }
    scrollToNow() {
        if (this.currentProgramTimeRef.current)
            this.currentProgramTimeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // window.scrollTo(0, this.currentProgramTimeRef.current.offsetTop);
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> {
        if (this.state.loading)
            return <div>
                <Divider className="social-sidebar-divider">Program at a Glance</Divider>
                <Spin />
            </div>


        let programDetails = [];
        let lastFormattedTime = null;

        let now = new Date();

        // Find the item at, or closest to, "now"
        let currentItem = this.state.curItems.find(item => item.get("startTime") <= now && item.get("endTime") >= now);
        if (!currentItem)
            currentItem = this.state.curItems.find(item => item.get("startTime") > now);

        for (let item of this.state.curItems) {
            if (item === currentItem) {
                programDetails.push(<div key="now" ref={this.currentProgramTimeRef}><Divider className="social-sidebar-divider"><NavLink to="/live/now">Now</NavLink></Divider></div>)
                this.lastRenderedNow = item.get("startTime");
            }
            let formattedTime = moment(item.get("startTime")).calendar();
            if (formattedTime !== lastFormattedTime)
                programDetails.push(<div className="programTime" key={"program-time" + item.id}>{formattedTime}</div>)
            lastFormattedTime = formattedTime;
            if (item instanceof ProgramSession) {
                programDetails.push(<ExpandableSessionDisplay session={item} isLive={false} key={item.id} />)
            } else if (item instanceof ProgramSessionEvent) {
                let isCurrent = item.get("startTime") <= now && item.get("endTime") >= now;
                programDetails.push(<ProgramSessionEventDisplay key={item.id} id={item.id} auth={this.props.auth} className={isCurrent ? "programEventLive" : "programEvent"} />)
            } else {
                console.log(item)
            }
        }
        if (this.state.curItems.length > 0 && !currentItem) {
            let item = this.state.curItems[this.state.curItems.length - 1];
            programDetails.push(<div key="now" ref={this.currentProgramTimeRef}><Divider className="social-sidebar-divider"><NavLink to="/live/now">Now</NavLink></Divider></div>)
            this.lastRenderedNow = item.get("startTime");
        }

        return <div id="upcomingProgramContainer">
            <Divider className="social-sidebar-divider">Program at a Glance</Divider>
            <Button type="primary" onClick={this.scrollToNow.bind(this)} className="program-scroll-button" size="small">Jump to Now</Button>
            <div id="upcomingProgram">
                {programDetails}
            </div>
            {/*<Collapse defaultActiveKey={[expandedKey]} className="program-collapse">*/}
            {/*{this.sessionView(this.state.pastSessions, "Past")}*/}
            {/*{this.sessionView(this.state.curSessions, "Live")}*/}
            {/*{this.sessionView(this.state.futureSessions, "Upcoming")}*/}
            {/*</Collapse>*/}
        </div>
    }

    private getNextUpdateTime(sessions: ProgramSession[]) {
        let nextUpdateTime = moment().add(1, "hour");
        let now = Date.now();
        let littleBitAfterNow = now + 60000 * startTImeOffsetForProgramDisplay;

        for (let session of sessions) {
            if (session.get("startTime") >= littleBitAfterNow && moment(session.get("startTime")) < nextUpdateTime) {
                nextUpdateTime = moment(session.get('startTime'));
            }
        }
        return nextUpdateTime;
    }

    private updateCurrentSessions() {
        let items: (ProgramSession | ProgramSessionEvent)[] = [];

        for (let s of this.state.ProgramSessions) {
            let displayAsEvents = false;
            if (s.get("programTrack")) {
                let t = this.state.ProgramTracks.find(v => v.id === s.get("programTrack").id);
                if (t)
                    displayAsEvents = t.get("showAsEvents");
            }
            if (!displayAsEvents) {
                items.push(s);
            }
            else if (s.get("events") && s.get("events").length) {
                let sessionEvents = s.get("events").map((ev: ProgramSessionEvent) => this.state.ProgramSessionEvents.find(e => e.id === ev.id)).filter((e: ProgramSessionEvent) => e !== null);
                items = items.concat(sessionEvents);
            }
        }
        items = items.sort(this.dateSorter);
        this.setState({
            loading: false,
            curItems: items,
            nextUpdateTime: this.getNextUpdateTime(this.state.ProgramSessions)
        }, () => {
            // console.log("Scrolling")
            this.scrollToNow();
        }
        );
    }
}
const AuthConsumer = () => (
    // <Router.Consumer>
    //     {router => (
    <AuthUserContext.Consumer>
        {value => (
            <UpcomingProgram auth={value} />
        )}
    </AuthUserContext.Consumer>
    // )}</Router.Consumer>

);

export default AuthConsumer;
