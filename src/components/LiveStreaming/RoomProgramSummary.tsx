import React, { Component } from "react";
import { AuthUserContext } from "../Session";
import { ClowdrState } from "../../ClowdrTypes";
import ProgramSession from "../../classes/ParseObjects/ProgramSession";
import ProgramRoom from "../../classes/ParseObjects/ProgramRoom";
import moment from "moment";
import { Collapse, Divider, Spin } from "antd";
import ProgramItem from "../../classes/ParseObjects/ProgramItem";
import ProgramItemDetails from "../ProgramItem/ProgramItemDetails";
import ProgramSessionEvent from "../../classes/ParseObjects/ProgramSessionEvent";
import Parse from "parse";
import assert from "assert";

interface RoomProgramSummaryProps {
    appState: ClowdrState;
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
        this.props.appState.programCache.getProgramRoom(this.props.ProgramRoom.id, this).then(async (room) => {
            assert(room, "The room no longer exists in the database, what on earth happened?");

            let [sessions, allEvents] = await Promise.all([this.props.appState.programCache.getProgramSessions(this),
            this.props.appState.programCache.getProgramSessionEvents(this)]);
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
            if (session.events) {
                sessionEvents = sessionEvents.concat(session.events
                    .map((e) => {
                        let x = allEvents.find(ev => ev.id === e.id);
                        // Necessary because `find` isn't guaranteed - though
                        // we rather hope that `allEvents` really does contain
                        // _all_ the events so it will always succeed.
                        assert(x);
                        return x;
                    }));
            }

            if (session.startTime > now && moment(session.startTime) < nextUpdateTime) {
                nextUpdateTime = moment(session.startTime);
            }
        }
        for (let event of sessionEvents) {
            if (event && event.startTime > now && moment(event.startTime) < nextUpdateTime) {
                nextUpdateTime = moment(event.startTime);
            }
        }
        return nextUpdateTime;
    }

    dateSorter(a: ProgramSession, b: ProgramSession) {
        var timeA = a.startTime ? a.startTime : new Date();
        var timeB = b.startTime ? b.startTime : new Date();
        return timeA > timeB ? 1 : timeA === timeB ? 0 : -1;
    }
    eventDateSorter(a: ProgramSessionEvent, b: ProgramSessionEvent) {
        var timeA = a.startTime ? a.startTime : new Date();
        var timeB = b.startTime ? b.startTime : new Date();
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
        this.props.appState.programCache.cancelSubscription("ProgramSession", this, undefined);
        if (this.props.ProgramRoom)
            this.props.appState.programCache.cancelSubscription("ProgramRoom", this, this.props.ProgramRoom.id);
    }

    sessionView(sessions: ProgramSession[], title: string) {
        // if(sessions.length === 0){
        //     return <></>
        // }
        let now = Date.now();
        return sessions.map(session => {
            let header;
            if (session.startTime < now && session.endTime < now) {
                //past
                header = session.title + " (Ended " + moment(session.endTime).calendar() + ")";
            }
            else if (session.startTime < now && session.endTime > now) {
                //active
                header = "Now: " + session.title + " (until " + moment(session.endTime).calendar() + ")";
            } else {
                //future
                header = session.title + " (Starting " + moment(session.startTime).calendar() + ")";
            }
            let curEvents: string[] = [];
            let sessionEvents: ProgramSessionEvent[] = [];
            if (session.events) {
                sessionEvents = session.events.map((e) => {
                    let x = this.state.ProgramSessionEvents.find(ev => ev.id === e.id);
                    assert(x);
                    return x;
                });
                curEvents = sessionEvents.filter(ev => ev.startTime <= Date.now() && ev.endTime >= Date.now()).map(e => e.programItem.id);
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
                            for (let item of session.items) {
                                openItems[item.id] = expandedKeys.includes(item.id);
                            }
                            return { expandedItems: openItems };
                        })

                    }}>
                    {sessionEvents.length ? sessionEvents.sort(this.eventDateSorter).map(event => {
                        if (!event) {
                            return <div></div>
                        }
                        let item = session.items.find((i: ProgramItem) => i.id === event.programItem.id);
                        assert(item);
                        let title;
                        let now = Date.now();
                        if (event.endTime < now) {
                            title = item.title + " (ended " + moment().to(event.endTime) + ")";
                        }
                        else if (event.startTime > now) {
                            title = item.title + " (" + moment().to(event.startTime) + ")";
                        }
                        else {
                            title = item.title + " (Now)";
                        }

                        return <Collapse.Panel key={event.programItem.id} header={title}>
                            <ProgramItemDetails ProgramItem={item} isInRoom={false} openChat={false} />
                        </Collapse.Panel>
                    }) : session.items ? session.items.map((item: ProgramItem) => {
                        return <Collapse.Panel key={item.id} header={item.title}>
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
                            for (let item of session.items) {
                                openItems[item.id] = false
                            }
                    if (!expandedKeys.includes("Future"))
                        for (let session of this.state.futureSessions)
                            for (let item of session.items) {
                                openItems[item.id] = false
                            }
                    for (let session of this.state.curSessions)
                        if (!expandedKeys.includes(session.id))
                            for (let item of session.items) {
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
                                    for (let item of session.items) {
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
                                    for (let item of session.items) {
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

        let filteredSessions = this.state.ProgramSessions.filter(s => s.room && s.room.id === this.props.ProgramRoom.id);
        for (let s of filteredSessions) {
            var timeS = s.startTime ? s.startTime : new Date();
            var timeE = s.endTime ? s.endTime : new Date();
            if (timeS <= now && timeE >= now) {
                curSessions.push(s);
                if (s.events) {
                    let sessionEvents = s.events.map((e: ProgramSessionEvent) => this.state.ProgramSessionEvents.find(ev => ev.id === e.id));
                    // @ts-ignore
                    curEvents = sessionEvents.filter(ev => ev.startTime <= Date.now() && ev.endTime >= Date.now()).map(e => e.programItem.id);
                    //@ts-ignore
                    curEvent = sessionEvents.find(ev => ev.startTime <= Date.now() && ev.endTime >= Date.now());
                }
            } else if (timeS > now) {
                futureSessions.push(s);
            } else {
                pastSessions.push(s);
            }
        }
        let expanded: { [k: string]: boolean } = {};
        for (let id of curEvents) {
            expanded[id] = true;
        }
        if (curEvent != null && curEvent !== this.state.currentEvent) {
            // Set the chat
            // TODO: Ed: Why is this being indirected through the cache?
            //       Couldn't we just use `curEvent.programItem` directly?
            this.props.appState.programCache.getProgramItem(curEvent.programItem.id, undefined).then(
                async (item) => {
                    assert(item, "The program item no longer exists in the database. Was it deleted?");

                    let chatSID = item.chatSID;
                    if (!chatSID) {
                        chatSID = await Parse.Cloud.run("chat-getSIDForProgramItem", {
                            programItem: item.id
                        });
                    }
                    if (chatSID) {
                        this.props.appState.chatClient.openChatAndJoinIfNeeded(chatSID, true);
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
        {value => (value == null ? <span>TODO: RoomProgramSummary when clowdrState is null.</span> :
            <RoomProgramSummary {...props} appState={value} />
        )}
    </AuthUserContext.Consumer>

);
export default AuthConsumer;

