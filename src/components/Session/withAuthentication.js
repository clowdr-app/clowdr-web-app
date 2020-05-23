import React from 'react';

import AuthUserContext from './context';
import Parse from "parse";

const withAuthentication = Component => {
    class WithAuthentication extends React.Component {
        constructor(props) {
            super(props);

            this.state = {
                user: null,
                refreshUser: this.refreshUser.bind(this)
            };
        }

        refreshUser() {
            let _this = this;
            return Parse.User.currentAsync().then(async function (user) {
                if (user) {
                    let Status = Parse.Object.extend("UserStatus");
                    //Logged in
                    if (!user.get("status")) {
                        let status = new Status();
                        status.set("user", user);
                        await status.save();
                        user.set("status", status);
                        await user.save();
                    } else {
                        user.get("status").save();
                    }
                    _this.setState({
                        user: user
                    });
                }
                else{
                    _this.setState({
                        user: null
                    })
                }
                // do stuff with your user
            });
        }
        componentDidMount() {
           this.refreshUser();
        }

        componentWillUnmount() {
        }

        render() {
            // if(this.state.loading)
            //     return <div>    <Spin size="large" />
            //     </div>
            return (
                <AuthUserContext.Provider value={this.state} >
                    <Component {...this.props}  />
                </AuthUserContext.Provider>
            );
        }
    }

    return WithAuthentication;
};

export default withAuthentication;
