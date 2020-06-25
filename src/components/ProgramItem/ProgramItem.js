import React from "react";
import {AuthUserContext} from "../Session";
import withAuthentication from "../Session/withAuthentication";
import Parse from "parse"
import {Alert, Spin} from "antd";

class ProgramItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {loading: true};
    }

    async componentDidMount() {
        //For social features, we need to wait for the login to complete before doing anything
        let user = await this.props.auth.refreshUser();

        let itemKey = this.props.match.params.programConfKey1 + "/"+this.props.match.params.programConfKey2;
        let pq = new Parse.Query("ProgramItem");
        pq.equalTo("confKey", itemKey);
        pq.include("track");
        pq.include("programSession")
        pq.include("programSession.room")
        pq.include("programSession.room.socialSpace")
        let res = await pq.first();
        if (!res) {
            this.setState({loading: false, error: "Unable to find the program item '" + itemKey + "'"});
        } else{
            if(user) {
                if(res.get("programSession") && res.get("programSession").get("room") && res.get("programSession").get("room").get("socialSpace")){
                    //set the social space...
                    let ss = res.get("programSession").get("room").get("socialSpace");
                    console.log(ss);
                    this.props.auth.setSocialSpace(ss.get("name"));
                }
                if (res.get("track").get("perProgramItemVideo")) {
                    //Ask for a token to join the video room
                }
                if (res.get("track").get("perProgramItemChat")) {
                    //Join the chat room
                    let chatSID = res.get("chatSID");
                    if (!chatSID) {
                        chatSID = await Parse.Cloud.run("chat-getSIDForProgramItem", {
                            programItem: res.id
                        });
                    }
                    this.props.auth.helpers.setGlobalState((prevState) => {
                        console.log(prevState)
                        return {
                        currentRoom: null,
                        forceChatOpen: true,
                        chatChannel: chatSID
                    }},()=>{
                        console.log("Set chat channel to " + chatSID)
                        console.log(this.props.auth.chatChannel)
                    });

                }
            }
            this.setState({loading: false, error: null, programItem: res});
        }
    }
    componentWillUnmount() {
        this.props.auth.helpers.setGlobalState({chatChannel: null, forceChatOpen: false});
    }

    render() {
        if (this.state.loading)
            return <Spin/>
        if(this.state.error){
            return  <Alert
                message="Unable to load program item"
                description={this.state.error}
                type="error"
            />
        }
        return <div className="programItemContainer">
            <div className="programItemMetadata">
                <h3>{this.state.programItem.get('title')}</h3>
                <p><b>Abstract: </b> {this.state.programItem.get("abstract")}</p>
            </div>
        </div>
    }
}

const AuthConsumer = (props) => (
    <AuthUserContext.Consumer>
        {value => (
            <ProgramItem {...props} auth={value}/>
        )}
    </AuthUserContext.Consumer>
);
export default AuthConsumer;