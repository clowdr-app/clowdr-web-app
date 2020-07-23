import React from "react";
import {Skeleton} from "antd";

export default class ProgramPersonDisplay extends React.Component{
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
        console.log(this.state.ProgramPerson)
        return <span className="programPerson">{this.state.ProgramPerson.get("name")}</span>
    }
}