import {AuthUserContext} from "../Session";
import withLoginRequired from "../Session/withLoginRequired";
import * as React from "react";
import {Skeleton} from "antd";
import { Profiler } from "inspector";

interface UserDescriptorState {
    userID: string;
    loading: Boolean;
    profile?: any;      /* BCP: What should this be?? */
}

interface UserDescriptorProps {
    id: string;
    authContext: any;   /* BCP: What should this be?? */
}

class UserDescriptor extends React.Component<UserDescriptorProps,UserDescriptorState>{
    constructor(props: any) {
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
const AuthConsumer = (props: UserDescriptorProps) => (
    <AuthUserContext.Consumer>
        {value => (
            <UserDescriptor {...props} authContext={value} />
        )}
    </AuthUserContext.Consumer>
);
export default withLoginRequired(AuthConsumer);
