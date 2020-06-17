import React from "react";
import {AuthUserContext} from "../Session";

class BottomChat extends React.Component {
    constructor(props) {
        super(props);
        // this.state = {chats:['a','b','c']};
        this.state = {chats: []};
    }

    componentDidMount() {
        this.setState({user: this.props.auth.user})
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (this.props.auth.user != this.state.user) {
            this.setState({
                    user: this.props.auth.user
                }
            );
        }
    }

    render() {
        if (this.state.user) {
            return (
                <div id="bottom-chat-container" style={this.props.style}>{
                    this.state.chats.map((chat)=>
                        (<BottomChatWindow key={chat} chat={chat} />)
                    )
                }
                </div>
            )
        }
        return <></>
    }
}

class BottomChatWindow extends React.Component{
    constructor(props){
        super(props);
        this.state ={collapsed: true, chat: this.props.chat, unreadCount: 0}
    }
    render() {
        if(this.state.collapsed){
            return <div>{this.state.chat}</div>
        }
    }
}
const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <BottomChat {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>

);
export default AuthConsumer;