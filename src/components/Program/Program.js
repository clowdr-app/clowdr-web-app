import React from 'react';
import {Select, Spin, Table} from 'antd';
import Parse from "parse";
import {AuthUserContext} from "../Session";
import Form from "antd/lib/form/Form";

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
        this.state = {sessions: [], loading: true,
        formatTime: (dateTimeStr)=>moment(dateTimeStr).format("LT")}
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
        console.log(table)
        return table;
    }

    async componentDidMount() {

        let trackQ = new Parse.Query("ProgramTrack");
        trackQ.equalTo("conference", this.props.auth.currentConference);
        trackQ.exists("displayName")
        let tracks = await trackQ.find();
        let trackOptions = tracks.map(t => ({label: t.get("displayName"), value: t.id}));
        let query = new Parse.Query("ProgramSession");
        query.include(["items"]);
        query.equalTo("conference", this.props.auth.currentConference)
        query.addAscending("startTime");
        query.find().then(res => {
            // let groupedByDate = groupBy(res,
            //     (item)=>moment(item.get("startTime")).format("ddd MMM D"))

            // let sessionTable = this.formatSessionsIntoTable(res);
            this.setState({
                // sessions: groupedByDate,
                sessions: res,
                loading: false,
                // tracks: trackOptions
            });

        })
        let query2 = new Parse.Query("LiveVideo");
        query2.first().then(video => {
            this.setState({dummyVideo: video});
        })
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
        <AuthUserContext.Consumer>
            {value => (
                <Program {...props} auth={value} />
            )}
        </AuthUserContext.Consumer>

    );
export default AuthConsumer;

