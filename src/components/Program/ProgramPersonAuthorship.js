import React from "react";
import {Skeleton, Tooltip} from "antd";
import UserStatusDisplay from "../Lobby/UserStatusDisplay";
import ProgramItemDisplay from "./ProgramItemDisplay";

export default class ProgramPersonAuthorship extends React.Component{
    constructor(props) {
        super(props);
        this.state ={};
    }
    async componentDidMount() {
        let person = await this.props.auth.programCache.getProgramPersonByID(this.props.id,this);
        this.setState({ProgramPerson: person});
    }
    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramPerson", this, this.props.id);
    }

    render() {
        if(!this.state.ProgramPerson){
            return <Skeleton.Input />
        }
        let items = [];
        if (this.state.ProgramPerson.get("programItems"))
            for (let item of this.state.ProgramPerson.get("programItems")) {
                items.push(<li key={item.id}><ProgramItemDisplay id={item.id} auth={this.props.auth}/></li>)
            }
        if(items.length == 0)
            items = "(No items)";
        return <div>
            <b>As author '{this.state.ProgramPerson.get("name")}'</b> <ul>{items}</ul>
        </div>
        if(this.state.ProgramPerson.get("userProfile")){
            return <UserStatusDisplay profileID={this.state.ProgramPerson.get("userProfile").id} style={{display: 'inline'}} />
        }
        return <Tooltip title={this.state.ProgramPerson.get("name") + " has not yet linked their CLOWDR and author records. To link these records, please go to 'My Account'."}><span className="programPerson">{this.state.ProgramPerson.get("name")}</span></Tooltip>
    }
}