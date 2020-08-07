import React from 'react';
import {ClowdrState} from "../../ClowdrTypes";
import ProgramSession from "../../classes/ProgramSession"
import {Collapse, Divider, Spin} from "antd";
import {AuthUserContext} from '../Session';
import ExpandableSessionDisplay from "./ExpandableSessionDisplay"
import moment from "moment";

interface UpcomingProgramProps {
    auth: ClowdrState | null;
}

interface UpcomingProgramState {
    loading: boolean,
    ProgramSessions: ProgramSession[],
    curSessions: ProgramSession[],
    pastSessions: ProgramSession[],
    futureSessions: ProgramSession[],
    nextUpdateTime: moment.Moment
}

class UpcomingProgram extends React.Component<UpcomingProgramProps, UpcomingProgramState> {
    private updateTimer?: number;
    constructor(props: UpcomingProgramProps) {
        super(props);
        this.state = {
            loading: true,
            ProgramSessions: [],
            curSessions: [],
            pastSessions: [],
            futureSessions: [],
            nextUpdateTime: moment().add(1, "hour")
        }
    }

    componentDidMount(): void {
        this.props.auth?.programCache.getProgramSessions(this).then((sessions) => {
            //find the next time we should update
            this.setState({
                ProgramSessions: sessions,
                nextUpdateTime: this.getNextUpdateTime(sessions)
            });
        });
    }

    componentDidUpdate(prevProps: Readonly<UpcomingProgramProps>, prevState: Readonly<UpcomingProgramState>, snapshot?: any): void {
        if (this.state.ProgramSessions != prevState.ProgramSessions) {
            this.updateCurrentSessions();
        }
        if (!this.state.nextUpdateTime.isSame(prevState.nextUpdateTime)) {
            if(this.updateTimer){
                window.clearTimeout(this.updateTimer);
            }
            let timeout  = this.state.nextUpdateTime.valueOf() - moment().valueOf();
            if(timeout < 0)
                timeout = 0 - timeout;
            this.updateTimer = window.setTimeout(this.updateCurrentSessions.bind(this), timeout);
        }
    }

    componentWillUnmount(): void {
        this.props.auth?.programCache.cancelSubscription("ProgramSession", this, null);
    }

    sessionView(sessions: ProgramSession[], title: string) {
        // if(sessions.length == 0){
        //     return <></>
        // }
        let items = [];
        let lastFormattedTime = null;
        for(let session of sessions.sort(this.dateSorter)){
            let formattedTime = moment(session.get("startTime")).calendar();
            if(title == "Live")
                formattedTime = "Until " + moment(session.get("endTime")).calendar();
            if(!session)
                continue;
            if(formattedTime != lastFormattedTime){
                items.push(<div key={"timeStamp"+session.id}>{formattedTime}</div>)
            }
            lastFormattedTime = formattedTime;
                items.push(<ExpandableSessionDisplay session={session} key={session.id} />)
        }
        return <Collapse.Panel header={title} key={title}>
            {items}
        </Collapse.Panel>
    }

    dateSorter(a: ProgramSession, b:ProgramSession) {
        var timeA = a.get("startTime") ? a.get("startTime") : new Date();
        var timeB = b.get("startTime") ? b.get("startTime") : new Date();
        return timeA > timeB ? 1 : timeA == timeB ? 0 : -1;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        if (this.state.loading)
            return <div>
                <Divider className="social-sidebar-divider">Program at a Glance</Divider>
                <Spin />
            </div>

        let expandedKey = "";
        if (this.state.curSessions.length > 0) {
            expandedKey = "Live";
        } else if (this.state.futureSessions.length > 0) {
            expandedKey = "Upcoming";
        } else if (this.state.pastSessions.length > 0) {
            expandedKey = "Past";
        }

        return <div>
            <Divider className="social-sidebar-divider">Program at a Glance</Divider>
            <Collapse defaultActiveKey={[expandedKey]} className="program-collapse">
            {this.sessionView(this.state.pastSessions, "Past")}
            {this.sessionView(this.state.curSessions, "Live")}
            {this.sessionView(this.state.futureSessions, "Upcoming")}
            </Collapse>
        </div>
    }

    private getNextUpdateTime(sessions: ProgramSession[]) {
        let nextUpdateTime = moment().add(1,"hour");
        let now = Date.now();
        for(let session of sessions){
            if(session.get("startTime") > now && moment(session.get("startTime")) < nextUpdateTime){
                nextUpdateTime = moment(session.get('startTime'));
            }
        }
        return nextUpdateTime;
    }

    private updateCurrentSessions() {
        let pastSessions = [];
        let curSessions = [];
        let futureSessions = [];
        let now = Date.now();

        for (let s of this.state.ProgramSessions) {
            var timeS = s.get("startTime") ? s.get("startTime") : new Date();
            var timeE = s.get("endTime") ? s.get("endTime") : new Date();
            if (timeS <= now && timeE >= now) {
                curSessions.push(s);
            } else if (timeS > now) {
                futureSessions.push(s);
            } else {
                pastSessions.push(s);
            }
        }
        this.setState({
            loading: false,
            nextUpdateTime: this.getNextUpdateTime(this.state.ProgramSessions),
            pastSessions: pastSessions, curSessions: curSessions, futureSessions: futureSessions
        });
    }
}
const AuthConsumer = () => (
    // <Router.Consumer>
    //     {router => (
    <AuthUserContext.Consumer>
        {value => (
            <UpcomingProgram auth={value}/>
        )}
    </AuthUserContext.Consumer>
    // )}</Router.Consumer>

);

export default AuthConsumer;