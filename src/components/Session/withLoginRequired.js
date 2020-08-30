import React from 'react';
import { Spin } from "antd";
import AuthUserContext from "./context";
import { withRouter } from 'react-router';

const withLoginRequired = Component => {
    class WithLoginRequired extends React.Component {

        constructor(props) {
            super(props);
            this.state = {
                isLoggedIn: false,
                showingLogin: false
            };
        }
        componentWillUnmount() {
            this.mounted = false;
        }

        componentDidMount() {
            this.mounted = true;
            this.context.refreshUser().then(u => {
                if (!this.mounted)
                    return;
                if (u) {
                    this.setState({ showingLogin: false });
                }
                else {
                    this.props.history.push("/signin");
                }
            })
        }

        render() {
            if (this.state.showingLogin) {
                this.props.history.push("/signin");
                return <></>;
            }
            return (
                <AuthUserContext.Consumer>
                    {authUserContext => {
                        if (authUserContext.user)
                            return (
                                <Component {...this.props} />
                            )
                        if (!authUserContext.user) {
                            if (this.state.showingLogin) {
                                return <Spin>I should show a login  here instead</Spin>
                            }
                            return <Spin />
                        }
                    }}
                </AuthUserContext.Consumer>
            );
        }
    }

    WithLoginRequired.contextType = AuthUserContext;
    return withRouter(WithLoginRequired);
};

export default withLoginRequired;
