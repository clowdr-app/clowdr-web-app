import { AuthUserContext } from "../Session";
import withLoginRequired from "../Session/withLoginRequired";
import * as React from "react";
import { Skeleton } from "antd";
import { Profiler } from "inspector";
import { ClowdrState } from "../../ClowdrTypes";

interface UserDescriptorState {
    userID: string;
    loading: boolean;
    profile?: any;      /* TS: What should this be?? */
}

interface UserDescriptorProps {
    id: string;
    clowdrAppState: ClowdrState | null;
}

class UserDescriptor extends React.Component<UserDescriptorProps, UserDescriptorState>{
    constructor(props: UserDescriptorProps) {
        super(props);
        this.state = { userID: props.id, loading: true };
    }
    async componentDidMount() {
        let profile = await this.props.clowdrAppState?.helpers.getUserRecord(this.props.id);
        this.setState({ profile: profile, loading: false });
    }
    render() {
        if (this.state.loading) {
            return <Skeleton.Input active style={{ width: '200px' }} />
        }
        // TS: This should be a better way, but I didn't get it to propagate the non-null information to the rest of the method
        // assert (this.props.clowdrAppState !== null);
        let popoverContent = <a href={"slack://user?team=" + this.props.clowdrAppState?.currentConference.get("slackWorkspace") + "&id=" + this.state.profile.get("slackID")}>Direct message on Slack</a>;
        return <div>
            {this.state.profile.get("displayName")}
        </div>
    }
}

const AuthConsumer = (props: UserDescriptorProps) => (
    <AuthUserContext.Consumer>
        {value => (
            <UserDescriptor {...props} clowdrAppState={value} />
        )}
    </AuthUserContext.Consumer>
);
export default withLoginRequired(AuthConsumer);
