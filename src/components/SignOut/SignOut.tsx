import React, { Component } from 'react';
import { Parse } from "../parse/parse";
import { AuthUserContext } from "../Session";
import { MaybeParseUser, MaybeClowdrInstance } from "../../ClowdrTypes";
import { RouteComponentProps, withRouter } from 'react-router'

interface SignOutProps extends RouteComponentProps {
    refreshUser: (instance?: MaybeClowdrInstance, forceRefresh?: boolean) => Promise<MaybeParseUser>;
}

interface SignOutState {
}

class SignOut extends Component<SignOutProps, SignOutState> {
    componentDidMount() {
        Parse.User.logOut().then(() => {
            this.props.refreshUser(null, true).then(() => {
                this.props.history.push("/" /*TODO: Lookup using router match*/);
            });
        }).catch((err) => {
            console.error(err);
        });
    }

    render() {
        return <></>
    }
}

const AuthConsumer = withRouter((props: SignOutProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <span>TODO: SignOut page when clowdrState is null.</span> :
            <SignOut {...props} refreshUser={value.refreshUser} />
        )}
    </AuthUserContext.Consumer>
));

export default AuthConsumer;
