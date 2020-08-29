import React, { Component } from "react";
import { AuthUserContext } from "../Session";
import { ClowdrState } from "../../ClowdrTypes";
import ProgramSession from "../../classes/ProgramSession";
import ProgramRoom from "../../classes/ProgramRoom";
import moment from "moment";
import { Collapse, Divider, Spin } from "antd";
import ProgramItem from "../../classes/ProgramItem";
import ProgramItemDetails from "../ProgramItem/ProgramItemDetails";
import ProgramSessionEvent from "../../classes/ProgramSessionEvent";
import Parse from "parse";

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
    ProgramSessionEvents: ProgramSessionEvent[];
    pastSessions: ProgramSession[];
    futureSessions: ProgramSession[];
    expandedItems: any;
    currentEvent: ProgramSessionEvent | null;
}

class RoomProgramSummary extends Component<RoomProgramSummaryProps, RoomProgramSummaryState> {
    private updateTimer?: number;

    constructor(props: RoomProgramSummaryProps) {
        super(props);
        this.state = {
            loading: true,
            ProgramSessions: [],
            ProgramSessionEvents: [],
            ProgramRoom: this.props.ProgramRoom,
            curSessions: [],
            pastSessions: [],
            futureSessions: [],
            nextUpdateTime: moment().add(1, "hour"),
            expandedItems: {},
            currentEvent: null
        }
    }

    componentDidMount() {
        this.props.appState?.programCache.getProgramRoom(this.props.ProgramRoom.id, this).then(async (room) => {
            let [sessions, allEvents] = await Promise.all([this.props.appState?.programCache.getProgramSessions(this),
            this.props.appState?.programCache.getProgramSessionEvents(this)]);
            this.setState({
                ProgramRoom: room,
                ProgramSessions: sessions,
                ProgramSessionEvents: allEvents,
                nextUpdateTime: this.getNextUpdateTime(sessions, allEvents)
            });
        })
    }
    getProgramTime() {
        // return moment("2020-08-12 10:30").toDate();
        return Date.now();
    }

    private getNextUpdateTime(sessions: ProgramSession[], allEvents: ProgramSessionEvent[]) {
        let nextUpdateTime = moment().add(1, "hour");
        let now = Date.now();
        let sessionEvents: ProgramSessionEvent[] = [];
        for (let session of sessions) {
            if (session.get("events")) {
                sessionEvents = sessionEvents.concat(session.get("events")
                    .map((e: ProgramSessionEvent) =>
                        allEvents.find(ev => ev.id === e.id)));
            }

            if (session.get("startTime") > now && moment(session.get("startTime")) < nextUpdateTime) {
                nextUpdateTime = moment(session.get('startTime'));
            }
        }
        for (let event of sessionEvents) {
            if (event && event.get("startTime") > now && moment(event.get("startTime")) < nextUpdateTime) {
                nextUpdateTime = moment(event.get("startTime"));
            }
        }
        return nextUpdateTime;
    }

    dateSorter(a: ProgramSession, b: ProgramSession) {
        var timeA = a.get("startTime") ? a.get("startTime") : new Date();
        var timeB = b.get("startTime") ? b.get("startTime") : new Date();
        return timeA > timeB ? 1 : timeA === timeB ? 0 : -1;
    }
    eventDateSorter(a: ProgramSessionEvent, b: ProgramSessionEvent) {
        var timeA = a.get("startTime") ? a.get("startTime") : new Date();
        var timeB = b.get("startTime") ? b.get("startTime") : new Date();
        return timeA > timeB ? 1 : timeA === timeB ? 0 : -1;
    }
    componentDidUpdate(prevProps: Readonly<RoomProgramSummaryProps>, prevState: Readonly<RoomProgramSummaryState>, snapshot?: any): void {
        if (this.state.ProgramSessions !== prevState.ProgramSessions) {
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
        if (this.props.ProgramRoom)
            this.props.appState?.programCache.cancelSubscription("ProgramRoom", this, this.props.ProgramRoom.id);
    }

    sessionView(sessions: ProgramSession[], title: string) {
        // if(sessions.length === 0){
        //     return <></>
        // }
        let now = new Date();
        return sessions.map(session => {
            let header;
            if (session.get("startTime") < now && session.get("endTime") < now) {
                //past
                header = session.get("title") + " (Ended " + moment(session.get("endTime")).calendar() + ")";
            }
            else if (session.get("startTime") < now && session.get("endTime") > now) {
                //active
                header = "Now: " + session.get("title") + " (until " + moment(session.get("endTime")).calendar() + ")";
            } else {
                //future
                header = session.get("title") + " (Starting " + moment(session.get("startTime")).calendar() + ")";
            }
            let curEvents: string[] = [];
            let sessionEvents: ProgramSessionEvent[] = [];
            if (session.get("events")) {
                sessionEvents = session.get("events").map((e: ProgramSessionEvent) => this.state.ProgramSessionEvents.find(ev => ev.id === e.id));
                curEvents = sessionEvents.filter(ev => ev.get("startTime") <= Date.now() && ev.get("endTime") >= Date.now()).map(e => e.get("programItem").id);
            }
            let activeKeys = curEvents.concat([]);
            for (let itemID of Object.keys(this.state.expandedItems)) {
                if (this.state.expandedItems[itemID])
                    activeKeys.push(itemID);
            }
            return (<Collapse.Panel key={session.id}
                header={header}>
                <Collapse
                    activeKey={activeKeys}
                    onChange={(expandedKeys) => {
                        this.setState((prevState) => {
                            let openItems = prevState.expandedItems;
                            for (let item of session.get("items")) {
                                openItems[item.id] = expandedKeys.includes(item.id);
                            }
                            return { expandedItems: openItems };
                        })

                    }}>
                    {sessionEvents.length ? sessionEvents.sort(this.eventDateSorter).map(event => {
                        if (!event) {
                            return <div></div>
                        }
                        let item = session.get("items").find((i: ProgramItem) => i.id === event.get("programItem").id);
                        let title;
                        let now = new Date();
                        if (event.get("endTime") < now) {
                            title = item.get("title") + " (ended " + moment().to(event.get("endTime")) + ")";
                        }
                        else if (event.get("startTime") > now) {
                            title = item.get("title") + " (" + moment().to(event.get("startTime")) + ")";
                        }
                        else {
                            title = item.get("title") + " (Now)";
                        }

                        return <Collapse.Panel key={event.get("programItem").id} header={title}>
                            <ProgramItemDetails ProgramItem={item} isInRoom={false} openChat={false} />
                        </Collapse.Panel>
                    }) : session.get('items') ? session.get('items').map((item: ProgramItem) => {
                        return <Collapse.Panel key={item.id} header={item.get("title")}>
                            <ProgramItemDetails ProgramItem={item} isInRoom={false} openChat={false} hiddenKeys={['joinLive', 'session']} />
                        </Collapse.Panel>
                    })
                            : <></>}
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

        let expandedKeys = [];
        if (this.state.curSessions.length > 0) {
            for (let session of this.state.curSessions) {
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
                    return { expandedItems: openItems };
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
                            return { expandedItems: openItems };
                        })
                    }}>
                        {this.sessionView(this.state.pastSessions, "Past")}
                    </Collapse>
                </Collapse.Panel>
                {this.sessionView(this.state.curSessions, "Now")}
                <Collapse.Panel header="Upcoming" key="Upcoming">
                    <Collapse className="program-collapse" onChange={(expandedKeys) => {
                        this.setState((prevState) => {
                            let openItems = prevState.expandedItems;
                            for (let session of this.state.futureSessions)
                                if (!expandedKeys.includes(session.id))
                                    for (let item of session.get("items")) {
                                        openItems[item.id] = false;
                                    }
                            return { expandedItems: openItems };
                        })
                    }}>
                        {this.sessionView(this.state.futureSessions, "Upcoming")}
                    </Collapse>
                </Collapse.Panel>
            </Collapse>
        </div>
    }

    private updateCurrentSessions() {
        let pastSessions: ProgramSession[] = [];
        let curSessions: ProgramSession[] = [];
        let futureSessions: ProgramSession[] = [];
        let now = this.getProgramTime();
        let curEvents: number[] = [];
        let curEvent: ProgramSessionEvent | null = null;

        let filteredSessions = this.state.ProgramSessions.filter(s => s.get("room") && s.get("room").id === this.props.ProgramRoom.id);
        for (let s of filteredSessions) {
            var timeS = s.get("startTime") ? s.get("startTime") : new Date();
            var timeE = s.get("endTime") ? s.get("endTime") : new Date();
            if (timeS <= now && timeE >= now) {
                curSessions.push(s);
                if (s.get("events")) {
                    let sessionEvents = s.get("events").map((e: ProgramSessionEvent) => this.state.ProgramSessionEvents.find(ev => ev.id === e.id));
                    // @ts-ignore
                    curEvents = sessionEvents.filter(ev => ev.get("startTime") <= Date.now() && ev.get("endTime") >= Date.now()).map(e => e.get("programItem").id);
                    //@ts-ignore
                    curEvent = sessionEvents.find(ev => ev.get("startTime") <= Date.now() && ev.get("endTime") >= Date.now());
                }
            } else if (timeS > now) {
                futureSessions.push(s);
            } else {
                pastSessions.push(s);
            }
        }
        let expanded = {};
        for (let id of curEvents) {
            // @ts-ignore
            expanded[id] = true;
        }
        if (curEvent != null && curEvent !== this.state.currentEvent) {
            //set the chat
            this.props.appState?.programCache.getProgramItem(curEvent.get("programItem").id, undefined).then(
                async (item) => {
                    let chatSID = item.get("chatSID");
                    if (!chatSID) {
                        chatSID = await Parse.Cloud.run("chat-getSIDForProgramItem", {
                            programItem: item.id
                        });
                    }
                    if (chatSID) {
                        this.props.appState?.chatClient.openChatAndJoinIfNeeded(chatSID, true);
                    }
                }
            )
        }
        this.setState((prevState) => {
            return {
                loading: false,
                expandedItems: expanded,
                currentEvent: curEvent,
                nextUpdateTime: this.getNextUpdateTime(filteredSessions, this.state.ProgramSessionEvents),
                pastSessions: pastSessions, curSessions: curSessions, futureSessions: futureSessions
            }
        });
    }

}

const AuthConsumer = (props: PublicRoomProgramSummaryProps) => (
    <AuthUserContext.Consumer>
        {value => (
            <RoomProgramSummary {...props} appState={value} />
        )}
    </AuthUserContext.Consumer>

);
export default AuthConsumer;

