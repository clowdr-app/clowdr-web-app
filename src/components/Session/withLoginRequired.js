import React from 'react';
import {Spin} from "antd";
import AuthUserContext from "./context";
import GenericLanding from "../GenericLanding";

const withLoginRequired = Component => {
    class WithLoginRequired extends React.Component {

        constructor(props) {
            super(props);
            this.state = {
                isLoggedIn: false,
                showingLogin: false
            };
        }

        render() {
            if (this.state.showingLogin){
                this.props.history.push("/signin");
                return<div></div>;
            }
            return (
                <AuthUserContext.Consumer>
                    {authUserContext => {
                        if (authUserContext.user)
                            return (
                                <Component {...this.props} />
                        )
                        if(!authUserContext.user){
                            if(this.state.showingLogin){
                                return <Spin>I should show a login  here instead</Spin>
                            }
                            authUserContext.refreshUser().then(u=>{
                                if(!u){
                                    this.setState({showingLogin: true});
                                }
                            })
                            return <Spin />
                        }
                    }}
                </AuthUserContext.Consumer>
            );
        }
    }

    WithLoginRequired.contextType = AuthUserContext;
    return WithLoginRequired;
};

export default withLoginRequired;
