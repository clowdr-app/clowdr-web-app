import React, {Component} from "react";
import {AuthUserContext} from "../Session";
import {ClowdrState} from "../../ClowdrTypes";
import ProgramSession from "../../classes/ProgramSession";
import ProgramRoom from "../../classes/ProgramRoom";
import moment from "moment";
import {Collapse, Divider, Spin} from "antd";
import ProgramItem from "../../classes/ProgramItem";
import ProgramItemDetails from "../ProgramItem/ProgramItemDetails";

interface RoomProgramSummaryProps {
    appState: ClowdrState | null;
    ProgramRoom: ProgramRoom;
}

interface PublicRoomProgramSummaryProps {
    ProgramRoom: ProgramRoom;
}

interface RoomProgramSummaryState {
    loading: boolean,
    ProgramSessions: ProgramSession[];
    ProgramRoom: ProgramRoom;
    nextUpdateTime: moment.Moment;
    curSessions: ProgramSession[];
    pastSessions: ProgramSession[];
    futureSessions: ProgramSession[];
    expandedItems: any;
}

class RoomProgramSummary extends Component<RoomProgramSummaryProps, RoomProgramSummaryState> {
    private updateTimer?: number;

    constructor(props: RoomProgramSummaryProps) {
        super(props);
        this.state={
            loading: true,
            ProgramSessions: [],
            ProgramRoom: this.props.ProgramRoom,
            curSessions: [],
            pastSessions: [],
            futureSessions: [],
            nextUpdateTime: moment().add(1, "hour"),
            expandedItems: {}
        }
    }

    componentDidMount() {
        this.props.appState?.programCache.getProgramRoom(this.props.ProgramRoom.id, this).then(async (room) => {
            let sessions = await this.props.appState?.programCache.getProgramSessions(this);
            this.setState({
                ProgramRoom: room,
                ProgramSessions: sessions,
                nextUpdateTime: this.getNextUpdateTime(sessions)
            });
        })
    }
    getProgramTime(){
        // return moment("2020-08-12 10:30").toDate();
        return Date.now();
    }

    private getNextUpdateTime(sessions: ProgramSession[]) {
        let nextUpdateTime = moment().add(1, "hour");
        let now = Date.now();
        for (let session of sessions) {
            if (session.get("startTime") > now && moment(session.get("startTime")) < nextUpdateTime) {
                nextUpdateTime = moment(session.get('startTime'));
            }
        }
        return nextUpdateTime;
    }

    dateSorter(a: ProgramSession, b: ProgramSession) {
        var timeA = a.get("startTime") ? a.get("startTime") : new Date();
        var timeB = b.get("startTime") ? b.get("startTime") : new Date();
        return timeA > timeB ? 1 : timeA == timeB ? 0 : -1;
    }

    componentDidUpdate(prevProps: Readonly<RoomProgramSummaryProps>, prevState: Readonly<RoomProgramSummaryState>, snapshot?: any): void {
        if (this.state.ProgramSessions != prevState.ProgramSessions) {
            this.updateCurrentSessions();
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
        this.props.appState?.programCache.cancelSubscription("ProgramSession", this, undefined);
        if(this.props.ProgramRoom)
            this.props.appState?.programCache.cancelSubscription("ProgramRoom", this, this.props.ProgramRoom.id);
    }

    sessionView(sessions: ProgramSession[], title: string) {
        // if(sessions.length == 0){
        //     return <></>
        // }
        let now = new Date();
        return sessions.map(session=> {
            let header;
            if(session.get("startTime") < now && session.get("endTime") < now){
                //past
                header = session.get("title") + " (Ended " + moment(session.get("endTime")).calendar() + ")";
            }
            else if(session.get("startTime") < now && session.get("endTime") > now){
                //active
                header = "Now: " + session.get("title") + " (until " + moment(session.get("endTime")).calendar() + ")";
            } else{
                //future
                header = session.get("title") + " (Starting " + moment(session.get("startTime")).calendar() + ")";
            }
            return (<Collapse.Panel key={session.id}
                             header={header}>
                <Collapse onChange={(expandedKeys) => {
                    this.setState((prevState)=>{
                        let openItems = prevState.expandedItems;
                        for(let item of session.get("items")){
                            openItems[item.id] = expandedKeys.includes(item.id);
                        }
                        return {expandedItems: openItems};
                    })

                }}>
                    {session.get('items') ? session.get('items').map((item: ProgramItem)=>{
                        return <Collapse.Panel key={item.id} header={item.get("title")}>
                            <ProgramItemDetails ProgramItem={item} isInRoom={false} openChat={this.state.expandedItems[item.id]} hiddenKeys={['joinLive','session']}/>
                        </Collapse.Panel>
                    }) : <></>}
                </Collapse>
            </Collapse.Panel>)
        });
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        if (this.state.loading)
            return <div>
                <Divider className="social-sidebar-divider">Program for this Room</Divider>
                <Spin />
            </div>

        let curSessionName = "Now (nothing scheduled)";
        let liveSessionPanel =[];
        let expandedKeys = [];
        if (this.state.curSessions.length > 0) {
            for(let session of this.state.curSessions){
                expandedKeys.push(session.id);
            }
        }

        return <div>
            <Divider className="social-sidebar-divider">Program for this Room</Divider>
            <Collapse defaultActiveKey={expandedKeys} className="program-collapse" onChange={(expandedKeys) => {
                this.setState((prevState) => {
                    let openItems = prevState.expandedItems;
                    if (!expandedKeys.includes("Past"))
                        for (let session of this.state.pastSessions)
                                for (let item of session.get("items")) {
                                    openItems[item.id] = false
                                }
                    if (!expandedKeys.includes("Future"))
                        for (let session of this.state.futureSessions)
                            for (let item of session.get("items")) {
                                openItems[item.id] = false
                            }
                    for (let session of this.state.curSessions)
                        if (!expandedKeys.includes(session.id))
                            for (let item of session.get("items")) {
                                openItems[item.id] = false
                            }
                    return {expandedItems: openItems};
                })
            }}>
                <Collapse.Panel header="Past" key="Past">
                    <Collapse className="program-collapse" onChange={(expandedKeys) => {
                        this.setState((prevState) => {
                            let openItems = prevState.expandedItems;
                            for (let session of this.state.pastSessions)
                                if (!expandedKeys.includes(session.id))
                                    for (let item of session.get("items")) {
                                        openItems[item.id] = false
                                    }
                            return {expandedItems: openItems};
                        })
                    }}>
                    {this.sessionView(this.state.pastSessions, "Past")}
                    </Collapse>
                </Collapse.Panel>
                {this.sessionView(this.state.curSessions, "Now")}
                <Collapse.Panel header="Upcoming" key="Upcoming">
                    <Collapse className="program-collapse"  onChange={(expandedKeys) => {
                        this.setState((prevState) => {
                            let openItems = prevState.expandedItems;
                            for (let session of this.state.futureSessions)
                                if (!expandedKeys.includes(session.id))
                                    for (let item of session.get("items")) {
                                        openItems[item.id] = false;
                                    }
                            return {expandedItems: openItems};
                        })}}>
                    {this.sessionView(this.state.futureSessions, "Upcoming")}
                    </Collapse>
                </Collapse.Panel>
            </Collapse>
        </div>
    }

    private updateCurrentSessions() {
        let pastSessions = [];
        let curSessions = [];
        let futureSessions = [];
        let now = this.getProgramTime();

        let filteredSessions = this.state.ProgramSessions.filter(s => s.get("room") && s.get("room").id == this.props.ProgramRoom.id);
        for (let s of filteredSessions) {
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
            nextUpdateTime: this.getNextUpdateTime(filteredSessions),
            pastSessions: pastSessions, curSessions: curSessions, futureSessions: futureSessions
        });
    }

}

const AuthConsumer = (props: PublicRoomProgramSummaryProps) => (
    <AuthUserContext.Consumer>
        {value => (
            <RoomProgramSummary {...props} appState={value}/>
        )}
    </AuthUserContext.Consumer>

);
export default AuthConsumer;

