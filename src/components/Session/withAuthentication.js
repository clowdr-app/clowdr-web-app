import React from 'react';

import AuthUserContext from './context';
import {withFirebase} from '../Firebase';

const withAuthentication = Component => {
    class WithAuthentication extends React.Component {
        constructor(props) {
            super(props);

            this.state = {
                authUser: JSON.parse(localStorage.getItem('authUser')),
            };
        }

        componentDidMount() {
            let _this = this;
            this.listener = this.props.firebase.onAuthUserListener(
                authUser => {
                    localStorage.setItem('authUser', JSON.stringify(authUser));
                    this.setState({authUser});
                    // Fetch the current user's ID from Firebase Authentication.
                    var uid = _this.props.firebase.auth.currentUser.uid;

                    // Create a reference to this user's specific status node.
                    // This is where we will store data about being online/offline.
                    var userStatusDatabaseRef = _this.props.firebase.db.ref('/status/' + uid);

                    // We'll create two constants which we will write to
                    // the Realtime database when this device is offline
                    // or online.
                    var isOfflineForDatabase = {
                        state: 'offline',
                        last_changed: _this.props.firebase.app.database.ServerValue.TIMESTAMP,
                    };

                    var isOnlineForDatabase = {
                        state: 'online',
                        last_changed: _this.props.firebase.app.database.ServerValue.TIMESTAMP,
                    };

                    // Create a reference to the special '.info/connected' path in
                    // Realtime Database. This path returns `true` when connected
                    // and `false` when disconnected.
                    _this.props.firebase.db.ref('.info/connected').on('value', function (snapshot) {
                        // If we're not currently connected, don't do anything.
                        if (snapshot.val() == false) {
                            return;
                        }
                        ;

                        // If we are currently connected, then use the 'onDisconnect()'
                        // method to add a set which will only trigger once this
                        // client has disconnected by closing the app,
                        // losing internet, or any other means.
                        userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(function () {
                            // The promise returned from .onDisconnect().set() will
                            // resolve as soon as the server acknowledges the onDisconnect()
                            // request, NOT once we've actually disconnected:
                            // https://firebase.google.com/docs/reference/js/firebase.database.OnDisconnect

                            // We can now safely set ourselves as 'online' knowing that the
                            // server will mark us as offline once we lose connection.
                            userStatusDatabaseRef.set(isOnlineForDatabase);
                        });
                    });

                },
                () => {
                    localStorage.removeItem('authUser');
                    this.setState({authUser: null});
                },
            );
        }

        componentWillUnmount() {
            this.listener();
        }

        render() {
            return (
                <AuthUserContext.Provider value={this.state.authUser}>
                    <Component {...this.props} user={this.state.authUser}/>
                </AuthUserContext.Provider>
            );
        }
    }

    return withFirebase(WithAuthentication);
};

export default withAuthentication;
