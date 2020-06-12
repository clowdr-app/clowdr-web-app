import {AuthUserContext} from "../Session";
import withLoginRequired from "../Session/withLoginRequired";
import React from "react";
import {Skeleton} from "antd";


class UserDescriptor extends React.Component{
    constructor(props){
        super(props);
        this.state = {userID: props.id, loading: true};
    }
    async componentDidMount() {
        let profile = await this.props.authContext.helpers.getUserRecord(this.props.id);
        this.setState({profile: profile, loading: false});
    }
    render() {
        if(this.state.loading){
            return <Skeleton.Input active style={{width: '200px'}} />
        }
        let popoverContent=<a href={"slack://user?team="+this.props.authContext.currentConference.get("slackWorkspace")+"&id="+this.state.profile.get("slackID")}>Direct message on Slack</a>;
        return <div>
            {this.state.profile.get("displayName")}
        </div>
    }
}
const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <UserDescriptor {...props} authContext={value}
            />
        )}
    </AuthUserContext.Consumer>
);
export default withLoginRequired(AuthConsumer);
