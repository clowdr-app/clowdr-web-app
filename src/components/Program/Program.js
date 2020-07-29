import React from 'react';
import {Descriptions, Radio, Skeleton, Spin, Table, Tag, Tooltip} from 'antd';
import Parse from "parse";
import {AuthUserContext} from "../Session";
import {NavLink} from "react-router-dom";
import {StarFilled, StarOutlined} from "@ant-design/icons";
import ProgramItemDisplay from "./ProgramItemDisplay";

var moment = require('moment');
var timezone = require('moment-timezone');

function groupBy(list, keyGetter) {
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
            ProgramSessions: [],
            loading: true,
            selectedDays: [],
            starredItems: [],
            timeZone: timezone.tz.guess(),
        }
    }
    async componentDidMount() {
        //find our saved program
        if(this.props.auth.userProfile) {
            let StarredProgram = Parse.Object.extend("StarredProgram");
            let progQ = new Parse.Query(StarredProgram);
            progQ.equalTo("user", this.props.auth.userProfile)
            progQ.first().then(async res=>{
               if(!res){
                   res = new StarredProgram();
                   res.set("user", this.props.auth.userProfile);
                   res.save();
               }

               let itemsQ = res.relation("items").query();
               itemsQ.limit(1000);
               let starredItems = await itemsQ.find();
               this.setState({starredProgram: res, starredItems: starredItems});
            });
        }
        let sessions = await this.props.auth.programCache.getProgramSessions(this);
        this.setState({ProgramSessions: sessions, loading: false});
        if(this.state.sessions && this.state.sessions.length){
            this.programLoaded();
        }
    }

    formatSessionsIntoTable(sessions){
        let groupedByDate = groupBy(sessions,
            (item)=>timezone(item.get("startTime")).tz(this.state.timeZone).format("ddd MMM D"));
        let table = [];
        for(const [date, rawSessions] of groupedByDate){
            if(this.state.selectedDays.length > 0 && !this.state.selectedDays.includes(date))
                continue;
            let row = {};
            let dateHeader = {label: date, rowSpan: 0};
            row.date = dateHeader;
            let timeBands = groupBy(rawSessions,(session)=>
                (<Tooltip mouseEnterDelay={0.5} title={timezone(session.get("startTime")).tz(this.state.timeZone).format("ddd MMM D LT ") +" - "+ timezone(session.get("endTime")).tz(this.state.timeZone).format("LT z")}>
                    {timezone(session.get("startTime")).tz(this.state.timeZone).format("LT")} - {timezone(session.get("endTime")).tz(this.state.timeZone).format("LT")}</Tooltip>))

            for(const [time, sessions ] of timeBands){
                let timeBandHeader = {label: time, rowSpan: 0};
                row.timeBand = timeBandHeader;
                for (let session of sessions) {
                    let sessionHeader = {label: session.get("title"), rowSpan: 0};
                    row.session = sessionHeader;
                    if (session.get("items")) {
                        for (let programItem of session.get("items")) {
                            if(this.state.filterByStar && !this.state.starredItems.find(item=>item.id == programItem.id))
                                continue;
                            row.key = programItem.id;
                            row.programItem = programItem.id;
                            row.confKey = programItem.get("confKey");
                            row.item = programItem;
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
        return table;
    }

    render() {
        if(this.state.loading){
            return <Spin></Spin>
        }
        let days = [];
        // for(const [date, program] of this.state.sessions){
        //     days.push(<ProgramDay date={date} program={program} key={date} formatTime={this.state.formatTime} />)
        // }


        let cols = [{
            title: 'Saved',
            className: "program-table-starred",
            render: (value, row, index) => {
                let starred = this.state.starredItems.find(item => item.id == row.item.id);
                return (starred ? <Tooltip title="Remove this from your saved program" placement="top"><StarFilled className="programStarStarred" onClick={()=> {
                        this.state.starredProgram.relation("items").remove(row.item);
                        this.state.starredProgram.save().catch((err) => console.log(err));
                        this.setState((prevState) => ({
                            starredItems: prevState.starredItems.filter(item => item.id != row.item.id)
                        }));
                }} /></Tooltip> :  <Tooltip title="Add this iem to your saved program" placement="top"><StarOutlined className="programStarNotStarred" onClick={()=> {
                        this.state.starredProgram.relation("items").add(row.item);
                        this.state.starredProgram.save().catch((err) => console.log(err));
                        this.setState((prevState) => ({
                            starredItems: [row.item, ...prevState.starredItems]
                        }));
                }} /></Tooltip>);
            }
        },{
            title: 'Date',
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
            },
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
                dataIndex: "programItem",
                render: (value, row, index)=>{
                    return <ProgramItemDisplay auth={this.props.auth} id={value} />
                }
            }
        ];
        const props = {width: 700, zoomWidth: 700,  zoomPosition: "original", img: 'https://2020.icse-conferences.org/getImage/orig/ICSE-Schedule.PNG'};
        return <div>
            <h4>Program Overview:</h4>
            {/* <ReactImageZoom {...props}/> */}

            <h4>Details:</h4>
            <Descriptions title="Filter">
                <Descriptions.Item label="Filter by day"><span className="filterOptions">{this.state.sessionDays? this.state.sessionDays.map(day=><Tag.CheckableTag
                    color="red"
                    checked={this.state.selectedDays.indexOf(day) > -1}
                    onChange={checked => {
                        this.setState(prevState => ({ selectedDays: checked ? [...prevState.selectedDays, day] : prevState.selectedDays.filter(t => t !== day)}));
                    }}
                    key={day}>{day}</Tag.CheckableTag>) : <Skeleton.Input />}</span></Descriptions.Item>
                <Descriptions.Item label="Filter by Starred">
                    <Radio.Group defaultValue={false} onChange={e => {this.setState({filterByStar: e.target.value})}}>
                        <Radio.Button value={false}>All</Radio.Button>
                        <Radio.Button value={true}><StarFilled className="programStarStarred" /> Only</Radio.Button>
                    </Radio.Group>
                </Descriptions.Item>
            </Descriptions>
            <Radio.Group defaultValue="timezone.tz.guess()" onChange={e => {this.setState({timeZone: e.target.value})}}>
                <Radio.Button value="timezone.tz.guess()">Local Time</Radio.Button>
                <Radio.Button value="UTC">UTC Time</Radio.Button>
            </Radio.Group>

            <br />
            <br />

            <div className="programPage">
                <div className="programFilters">
                   {/*<Form>*/}
                   {/*    <Form.Item label={"Track"}>*/}
                   {/*        <Select mode="multiple" placeholder="Filter by track" options={this.state.tracks}/>*/}
                   {/*    </Form.Item>*/}
                   {/*</Form>*/}
                </div>
                <Table columns={cols} pagination={false} dataSource={
                    this.formatSessionsIntoTable(this.state.ProgramSessions.sort((a,b)=> {
                        return a.get("startTime") && b.get("startTime") ? moment(a.get("startTime")).diff(moment(b.get('startTime'))) : 0
                    }
                ))} loading={this.state.loading}></Table>
            </div>
        </div>
    }

    programLoaded() {
        // if(this.state.loading){
        //     let days = [... new Set(this.state.sessions.map((item)=>timezone(item.get("startTime")).tz(this.state.timeZone).format("ddd MMM D")))];
        //     this.setState({sessionDays: days})
        // }
    }
}
class ProgramDay extends React.Component{
    constructor(props) {
        super(props);
        //organize into time bands
        let timeBands = groupBy(this.state.program,(session)=>(this.props.formatTime(session.get("startTime"))+ " - ") + this.props.formatTime(session.get('endTime')))
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
                <Program {...props} auth={value}  />
            )}
        </AuthUserContext.Consumer>

    );
export default AuthConsumer;

