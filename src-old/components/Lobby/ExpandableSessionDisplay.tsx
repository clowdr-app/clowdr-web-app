import React from 'react';
import { ClowdrState } from "../../ClowdrTypes";
import ProgramSession from "../../classes/ProgramSession"
import { AuthUserContext } from '../Session';
import ProgramItem from "../../classes/ProgramItem";
import { Collapse } from 'antd';
import ProgramItemDisplay from "../Program/ProgramItemDisplay";
import ProgramSessionEvent from "../../classes/ProgramSessionEvent";
import ProgramSessionEventDisplay from "../Program/ProgramSessionEventDisplay";

interface ExpandableSessionDisplayProps {
    auth: ClowdrState | null;
    session: ProgramSession;
    isLive: boolean;
}

interface ExpandableSessionDisplayState {
    loading: boolean,
    ProgramItems: ProgramItem[],
    events: ProgramSessionEvent[]
}

class ExpandableSessionDisplay extends React.Component<ExpandableSessionDisplayProps, ExpandableSessionDisplayState> {
    constructor(props: ExpandableSessionDisplayProps) {
        super(props);
        this.state = {
            loading: true,
            ProgramItems: [],
            events: []
        }
    }
    componentDidMount(): void {
        if (this.props.session.get("events")) {
            let events = this.props.session.get("events").map((e: ProgramSessionEvent) => this.props.auth?.programCache.getProgramSessionEvent(e.id));
            //@ts-ignore
            Promise.all(events).then((ev) => this.setState({ events: ev }));
        }
    }
    dateSorter(a: ProgramSessionEvent, b: ProgramSessionEvent) {
        var timeA = a.get("startTime") ? a.get("startTime") : new Date();
        var timeB = b.get("startTime") ? b.get("startTime") : new Date();
        return timeA > timeB ? 1 : timeA === timeB ? 0 : -1;
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {

        let items;
        let expandedKeys: React.ReactText[] = [];
        if (this.props.session.get("events") && this.state.events.length) {
            if (!this.state.events.length)
                return <div></div>
            let events = this.state.events.sort(this.dateSorter);
            if (this.props.isLive) {
                events = [];
                let future = [];
                let now = [];
                let past = [];
                let curTime = new Date();
                for (let event of this.state.events) {
                    let startTime = event.get("startTime");
                    let endTime = event.get("endTime");
                    if (endTime < curTime) {
                        past.push(event)
                    } else if (startTime <= curTime && endTime >= curTime) {
                        now.push(event);
                    } else if (startTime > curTime) {
                        future.push(event);
                    }
                }
                if (past.length) { // @ts-ignore
                    events.push(past.pop());
                }
                events = events.concat(now);
                if (future.length)
                    events.push(future[0]);
            }
            items = events.map((item: ProgramSessionEvent) => {
                return <ProgramSessionEventDisplay key={item.id} id={item.id} auth={this.props.auth} showBreakoutRoom={true} />
            })
        }
        else if (this.props.session.get("items")) {
            items = this.props.session.get('items').map((item: ProgramItem) => {
                return <div key={item.id}>
                    <ProgramItemDisplay id={item.id} auth={this.props.auth} showBreakoutRoom={true} />
                </div>
            })
        }
        let className = "expandableProgramSummary";
        if (this.props.isLive) {
            expandedKeys = [this.props.session.id];
            className = "expandableProgramSummaryLive"
        }
        return <Collapse className="program-session-collapse" defaultActiveKey={expandedKeys}>
            <Collapse.Panel key={this.props.session.id} header={this.props.session.get("title")} className={className}>
                {items}
            </Collapse.Panel></Collapse>
    }
}
interface PublicExpandableSessionDisplayProps {
    session: ProgramSession;
    isLive: boolean;
}
const AuthConsumer = (props: PublicExpandableSessionDisplayProps) => (
    // <Router.Consumer>
    //     {router => (
    <AuthUserContext.Consumer>
        {value => (
            <ExpandableSessionDisplay isLive={props.isLive} session={props.session} auth={value} />
        )}
    </AuthUserContext.Consumer>
    // )}</Router.Consumer>

);

export default AuthConsumer;
