import React from 'react';

class Lobby extends React.Component {
    constructor(props) {
        super(props);
        console.log(this.props);
        this.state = {"expanded": false};
    }


    render() {
        if(!this.props.firebase.auth.currentUser){
            return <div>You are not logged in?</div>
        }
        const user = this.props.firebase.auth.currentUser;
        return <div>You're in the lobby, {user.displayName}</div>
    }
}

export default Lobby;