import React, { Component } from 'react';
import * as ROUTES from '../../constants/routes';
import { Parse } from "../parse/parse";
import { AuthUserContext } from "../Session";
import { MaybeParseUser, MaybeClowdrInstance } from "../../ClowdrTypes";

interface SignOutProps {
    history: string[];
    refreshUser: (instance?: MaybeClowdrInstance, forceRefresh?: boolean) => Promise<MaybeParseUser>;
}

interface SignOutState {
}

class SignOut extends Component<SignOutProps, SignOutState> {
    componentDidMount() {
        Parse.User.logOut().then(() => {
            this.props.refreshUser(null, true).then(() => {
                this.props.history.push(ROUTES.LANDING);
            });
        }).catch((err) => {
            console.log(err);
        });
    }

    render() {
        return <div></div>
    }
}

const AuthConsumer = (props: SignOutProps) => (
    <AuthUserContext.Consumer>
        {value => (value == null ? <span>TODO: SignOut page when clowdrState is null.</span> :
            <SignOut {...props} refreshUser={value.refreshUser} />
        )}
    </AuthUserContext.Consumer>
);

export default AuthConsumer;
