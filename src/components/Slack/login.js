import {AuthUserContext} from "../Session";
import React from "react";
import {Spin} from "antd";
import Parse from "parse";

class SlackLogin extends React.Component{

    componentDidMount() {
        let token = this.props.match.params.token;
        let slackUser = this.props.match.params.slackUser;
        let destination = this.props.match.params.destination;

        let authData = {
            id: token,
            user: slackUser
        };
        const user = new Parse.User();
        user.linkWith('anonymous', { authData: authData }).then(()=>{
            this.props.refreshUser();
        });
        //Was there a destination?
        if(!destination || !destination.startsWith("/"))
            destination="/";
        this.props.history.push(destination);

    }

    render(){
        return <div><Spin/>Logging you in...</div>
    }
}
const AuthConsumer = (props)=>(
    <AuthUserContext.Consumer>
        {value => (
            <SlackLogin {...props} user={value.user} refreshUser={value.refreshUser}/>
        )}
    </AuthUserContext.Consumer>
);

export default AuthConsumer;