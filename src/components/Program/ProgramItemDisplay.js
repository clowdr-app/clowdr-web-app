import {NavLink} from "react-router-dom";
import React from "react";
import {Skeleton} from "antd";
export default class ProgramItemDisplay extends React.Component{
    constructor(props){
        super(props);
        this.state = {loading: true};
    }

    async componentDidMount() {
        let programItem = await this.props.auth.programCache.getProgramItem(this.props.id, this);
        this.setState({
            ProgramItem: programItem,
            loading: false
        })
    }
    componentWillUnmount() {
        this.props.auth.programCache.cancelSubscription("ProgramItem", this, this.props.id);
    }

    render() {
        if(this.state.loading){
            return <Skeleton.Input />
        }
        return <NavLink to={"/program/"+this.state.ProgramItem.get("confKey")}>{this.state.ProgramItem.get("title")}</NavLink>
    }
}