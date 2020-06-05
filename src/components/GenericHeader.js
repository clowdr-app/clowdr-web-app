import React, {Component} from "react";
import {AuthUserContext} from "./Session";
import {NavLink} from "react-router-dom";
import {Layout} from "antd";

const {Header, Content, Footer, Sider} = Layout;

class GenericHeader extends Component {
    constructor(props) {
        super(props);
        let confName ='';
        if(this.props.authContext.currentConference){
            confName = this.props.authContext.currentConference.get("conferenceName");
        }
        this.state = {conferenceName: confName};
    }


    componentDidUpdate() {
        if (this.props.authContext.currentConference) {
            let name = this.props.authContext.currentConference.get("conferenceName");
            if (this.state.conferenceName != name) {
                this.setState({conferenceName: name});
            }
        }
    }

    render() {
        return <Header className="site-layout-background"><h1>
            {this.state.conferenceName} Group Video Chat</h1></Header>
    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <GenericHeader {...props} authContext={value}
            />
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumer;
