import React from 'react';

import AuthUserContext from './context';
import Parse from "parse";

const withAuthentication = Component => {
    class WithAuthentication extends React.Component {

        constructor(props) {
            super(props);
            this.authCallbacks = [];
            this.isLoggedIn = false;
            this.state = {
                user: null,
                refreshUser: this.refreshUser.bind(this)
            };
        }

        refreshUser(callback) {

            let _this = this;
            return Parse.User.currentAsync().then(async function (user) {
                if (user) {
                    if (!_this.isLoggedIn) {
                        _this.isLoggedIn = true;
                        _this.authCallbacks.forEach((cb) => (cb(user)));
                    }
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
                    if(callback){
                        _this.authCallbacks.push(callback);
                    }
                    return user;
                } else {
                    if (_this.isLoggedIn) {
                        _this.isLoggedIn = false;
                        _this.authCallbacks.forEach((cb) => (cb(null)));
                    }
                    _this.setState({
                        user: null
                    })
                    if(callback){
                        _this.authCallbacks.push(callback);
                    }
                    return null;
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
