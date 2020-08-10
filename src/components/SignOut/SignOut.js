import React, {Component} from 'react';
import * as ROUTES from '../../constants/routes';
import {Parse} from "../parse/parse";
import withAuthentication from "../Session/withClowdrState"
import {AuthUserContext} from "../Session";

class SignOut extends Component {
    constructor(props) {
        super(props);
    }
    componentDidMount() {
        Parse.User.logOut().then(() => {
            this.props.refreshUser(null, true).then(()=>{
                this.props.history.push(ROUTES.LANDING);
            });
        }).catch((err)=>{
            console.log(err);
        });
    }

    render() {
        return <div></div>
    }
}

const AuthConsumer = (props)=>(
    <AuthUserContext.Consumer>
        {value => (
            <SignOut {...props} user={value.user} refreshUser={value.refreshUser}/>
        )}
    </AuthUserContext.Consumer>
);

export default AuthConsumer;
