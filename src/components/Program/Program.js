import React from 'react';
import {Select, Spin, Table} from 'antd';
import Parse from "parse";
import {AuthUserContext} from "../Session";
import Form from "antd/lib/form/Form";
import withProgram from './withProgram';
import ProgramContext from './context';
import { ContactlessOutlined } from '@material-ui/icons';

var moment = require('moment');
function  groupBy(list, keyGetter) {
    const map = new Map();
    list.forEach((item) => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
}
class Program extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            sessions: [], 
            loading: true,
            gotTracks: false,
            gotRooms: false,
            forItems: false,
            gotSessions: false,
            formatTime: (dateTimeStr)=>moment(dateTimeStr).format("LT")
        }

        console.log('[Program]: downloaded? ' + this.props.downloaded);

        // Call to download program
        if (!this.props.downloaded) 
            this.props.onDown(this.props);
        else
            this.state.sessions = this.props.sessions;
    }

    formatSessionsIntoTable(sessions){
        let groupedByDate = groupBy(sessions,
            (item)=>moment(item.get("startTime")).format("ddd MMM D"))
        let table = [];
        for(const [date, rawSessions] of groupedByDate){
            let row = {};
            let dateHeader = {label: date, rowSpan: 0};
            row.date = dateHeader;
            let timeBands = groupBy(rawSessions,(session)=>(this.state.formatTime(session.get("startTime"))+ " - ") + this.state.formatTime(session.get('endTime')))

            for(const [time, sessions ] of timeBands){
                let timeBandHeader = {label: time, rowSpan: 0};
                row.timeBand = timeBandHeader;
                for (let session of sessions) {
                    let sessionHeader = {label: session.get("title"), rowSpan: 0};
                    row.session = sessionHeader;
                    if (session.get("items")) {
                        for (let programItem of session.get("items")) {
                            row.key = programItem.id;
                            row.programItem = programItem.get("title");
                            table.push(row);
                            row = {};
                            row.session = {};
                            row.timeBand = {};
                            row.date = {};
                            dateHeader.rowSpan++;
                            timeBandHeader.rowSpan++;
                            sessionHeader.rowSpan++;
                        }
                    }
                }
            }
        }
        console.log(table)
        return table;
    }

    componentDidUpdate(prevProps) {
        console.log("[Program]: Something changed");

        if (this.state.loading && this.state.gotTracks && this.state.gotRooms && this.state.gotItems && this.state.gotSessions) {
            console.log('[Program]: Program download complete');
            this.setState({
                // sessions: groupedByDate,
                sessions: this.props.sessions,
                loading: false,
                // tracks: trackOptions
            });
        }
        else {
            console.log('[Program]: Program still downloading...');
            if (prevProps.tracks.length != this.props.tracks.length) {
                this.setState({gotTracks: true});
                console.log('[Program]: got tracks');
            }
            if (prevProps.rooms.length != this.props.rooms.length) {
                this.setState({gotRooms: true})
                console.log('[Program]: got rooms');
            }
            if (prevProps.items.length != this.props.items.length) {
                this.setState({gotItems: true})
                console.log('[Program]: got items');
            }
            if (prevProps.sessions.length != this.props.sessions.length) {
                this.setState({gotSessions: true})
                console.log('[Program]: got sessions');
            }
        }
    }


    render() {
        if(!this.state.sessions){
            return <Spin></Spin>
        }
        let days = [];
        // for(const [date, program] of this.state.sessions){
        //     days.push(<ProgramDay date={date} program={program} key={date} formatTime={this.state.formatTime} />)
        // }
        let cols = [{
            title: 'date',
            className:"program-table-date",
            dataIndex: 'date',
            render: (value, row, index) => {
                const obj = {
                    children: value.label,
                    props: {}
                }
                if (value && value.rowSpan)
                    obj.props.rowSpan = value.rowSpan;
                else
                    obj.props.rowSpan = 0;
                return obj;
            }
        },{  title: 'Time',
            dataIndex: 'timeBand',
            className:"program-table-timeBand",
            render: (value, row, index) => {
                const obj = {
                    children: value.label,
                    props: {}
                }
                if (value && value.rowSpan)
                    obj.props.rowSpan = value.rowSpan;
                else
                    obj.props.rowSpan = 0;
                return obj;
            }
        },{  title: 'Session',
            className:"program-table-session",
            dataIndex: 'session',
            render: (value, row, index) => {
                const obj = {
                    children: value.label,
                    props: {}
                }
                if (value && value.rowSpan)
                    obj.props.rowSpan = value.rowSpan;
                else
                    obj.props.rowSpan = 0;
                return obj;
            }
        },
            {
                title: "Content",
                className:"program-table-programItem",
                dataIndex: "programItem"
            }
        ];
        return <div>
            <h4>Program Overview:</h4>
            <div className="programPage">
                <div className="programFilters">
                   {/*<Form>*/}
                   {/*    <Form.Item label={"Track"}>*/}
                   {/*        <Select mode="multiple" placeholder="Filter by track" options={this.state.tracks}/>*/}
                   {/*    </Form.Item>*/}
                   {/*</Form>*/}
                </div>
                <Table columns={cols} pagination={false} dataSource={this.formatSessionsIntoTable(this.state.sessions)}></Table>
            </div>
        </div>
    }
}
class ProgramDay extends React.Component{
    constructor(props) {
        super(props);
        //organize into time bands
        let timeBands = groupBy(this.props.program,(session)=>(this.props.formatTime(session.get("startTime"))+ " - ") + this.props.formatTime(session.get('endTime')))
        this.state = {
            timeBands : timeBands
        }
    }
    render(){
        let timeBands = [];
        for(const[timeBand, sessions] of this.state.timeBands){
            timeBands.push(<div key={timeBand} className="sessionTimeBandContainer"><div className="timeBand">{timeBand}</div>
            <div className="sessionContainer">{sessions.map(s=><ProgramSession key={s.id} session={s}/>)}</div></div>)
        }
        return <div className="program-programDay" key={this.props.date}>
            <div className="day">{this.props.date}</div>
            <div className="timebands">{timeBands}</div>
        </div>
    }
}

class ProgramSession extends React.Component {
    render() {
        let items = this.props.session.get("items");
        return <div className="programSession" >
            <div className="sessionTitle">{this.props.session.get("title")}</div>
            <div className="sessionContents">
                {items.map(i => <ProgramItem key={i.id} item={i}/>)}
            </div>
        </div>
    }
}

class ProgramItem extends React.Component {
    render() {
        return (
            <div className="programItem" key={this.props.item.id}>
                {this.props.item.get("title")}
            </div>
        );
    }
}
const
    AuthConsumer = (props) => (
        <ProgramContext.Consumer>
            {({rooms, tracks, items, sessions, onDownload, downloaded}) => (
                <AuthUserContext.Consumer>
                    {value => (
                        <Program {...props} auth={value} rooms={rooms} tracks={tracks} items={items} sessions={sessions} onDown={onDownload} downloaded={downloaded}/>
                    )}
                </AuthUserContext.Consumer>
            )}
        </ProgramContext.Consumer>

    );
export default AuthConsumer;

