import React from 'react';
import Parse from "parse";
import {AuthUserContext} from "../../Session";

class Posters extends React.Component {
    constructor(props) {
        super(props);
        console.log('Made it to posters');
        this.state = {
            posters: [], 
            demos: [],
            loading: true}
    }

    componentDidMount() {
    }


    render() {
        return <div>
            <h4>Posters & Demos:</h4>
        </div>
    }
}

const PostersWithAuth = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <Posters {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);
        
export default PostersWithAuth;

