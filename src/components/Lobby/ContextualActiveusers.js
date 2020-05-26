import ActiveUsers from "./ActiveUsers";
import React, {Component} from "react";
import ParseLiveContext from "../parse/context";
import {AuthUserContext} from "../Session";
class ContextualActiveUsers extends Component{
    render() {
        if(!this.props.parseLive){
            return <div></div>
        }
        return <ActiveUsers auth={this.props.auth} parseLive={this.props.parseLive} />
    }
}
const AuthConsumer = (props) => (
    <ParseLiveContext.Consumer>
        {parseLive => (
            <AuthUserContext.Consumer>
                {value => (
                    <ContextualActiveUsers {...props}  parseLive={parseLive} auth={value}  />
                )}
            </AuthUserContext.Consumer>
        )}
    </ParseLiveContext.Consumer>

);

export default AuthConsumer
