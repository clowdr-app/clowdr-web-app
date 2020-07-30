import { AuthUserContext } from "../Session";
import withLoginRequired from "../Session/withLoginRequired";
import * as React from "react";
import { Skeleton } from "antd";
import { Profiler } from "inspector";
import { AuthContext } from "../../ClowdrTypes";

interface UserDescriptorState {
    userID: string;
    loading: Boolean;
    profile?: any;      /* TS: What should this be?? */
}

interface UserDescriptorProps {
    id: string;
    authContext: AuthContext | null;   
}

class UserDescriptor extends React.Component<UserDescriptorProps, UserDescriptorState>{
    constructor(props: UserDescriptorProps) {
        super(props);
        this.state = { userID: props.id, loading: true };
    }
    async componentDidMount() {
        if (this.props.authContext) { // Should always succeed -- only null during initialization
            let profile = await this.props.authContext.helpers.getUserRecord(this.props.id);
            this.setState({ profile: profile, loading: false });
        }
    }
    render() {
        if (this.state.loading) {
            return <Skeleton.Input active style={{ width: '200px' }} />
        }
        if (this.props.authContext) { // Should always succeed -- only null during initialization
            let popoverContent = <a href={"slack://user?team=" + this.props.authContext.currentConference.get("slackWorkspace") + "&id=" + this.state.profile.get("slackID")}>Direct message on Slack</a>;
            return <div>
                {this.state.profile.get("displayName")}
            </div>
        }
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
