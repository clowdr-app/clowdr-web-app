import React, {Component} from 'react';
import * as ROUTES from '../../constants/routes';
import { withFirebase } from '../Firebase';

class SignOut extends Component {
    constructor(props) {
        super(props);

        this.props.firebase.doSignOut().then(()=>{
            this.props.history.push(ROUTES.LANDING);
        });
    }

    render() {
        return "OK";
    }
}

export default withFirebase(SignOut);
