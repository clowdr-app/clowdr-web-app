import React, {Component} from "react";
import {AuthUserContext} from "./Session";
import {NavLink} from "react-router-dom";
import {Layout} from "antd";

const {Header, Content, Footer, Sider} = Layout;

class GenericHeader extends Component {
    constructor(props) {
        super(props);
        let confName ='';
        if(this.props.clowdrAppState.currentConference){
            confName = this.props.clowdrAppState.currentConference.get("conferenceName");
        }
        this.state = {conferenceName: confName};
    }


    componentDidUpdate() {
        if (this.props.clowdrAppState.currentConference) {
            let name = this.props.clowdrAppState.currentConference.get("conferenceName");
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
            <GenericHeader {...props} clowdrAppState={value}
            />
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumer;
