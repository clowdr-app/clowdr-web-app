import React, {Component} from "react";
import {Layout, Tooltip} from "antd";
import ContextualActiveUsers from "../Lobby/ContextualActiveusers";
import {AuthUserContext} from "../Session";
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

class SocialTab extends Component {
    constructor(props) {
        super(props);

        let siderWidth = Number(localStorage.getItem("lobbyWidth"));
        if(siderWidth == 0)
            siderWidth = 250;
        else if(siderWidth == -1)
            siderWidth = 0;
        this.state = {siderCollapsed: this.props.collapsed, siderWidth: siderWidth, visible: false}
        this.props.setWidth(siderWidth);
    }
    componentWillUnmount() {
    }
    componentDidMount() {
        this.props.setWidth(this.state.siderWidth);
        this.props.auth.refreshUser().then((u)=>{
            if(u && u.get("passwordSet")){
                this.setState({visible: true});
            }
            else{
                this.props.setWidth(0)
            }
        })
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if(!this.state.visible && this.props.auth.user && this.props.auth.user.get("passwordSet")){
            if(this.state.siderWidth < 10){
                this.setState({visible: true, siderWidth: 250});
                this.props.setWidth(250);
            }else{
                this.setState({visible: true});
                this.props.setWidth(this.state.siderWidth);
            }
        }
    }

    setDrawerWidth(width){
        this.setState({siderWidth: width})
        this.props.setWidth(width);
        localStorage.setItem("lobbyWidth", (width == 0 ? -1 : width));
    }

    render() {
        let topHeight = 0;
        let topElement = document.getElementById("top-content");
        if(topElement)
            topHeight = topElement.clientHeight;

        if(!this.state.visible){
            return <div></div>
        }
        const handleMouseDown = e => {
            document.addEventListener("mouseup", handleMouseUp, true);
            document.addEventListener("mousemove", handleMouseMove, true);
        };

        const handleMouseUp = () => {
            document.removeEventListener("mouseup", handleMouseUp, true);
            document.removeEventListener("mousemove", handleMouseMove, true);
        };

        const handleMouseMove = (e) => {
            const newWidth = e.clientX - document.body.offsetLeft;
            if (newWidth >= 0 && newWidth <= 600)
                this.setDrawerWidth(newWidth);
        };
        let containerStyle = {width: this.state.siderWidth, top: topHeight};
        if(this.state.siderWidth <5){
            containerStyle.width="10px";
        }
        return <div className="activeRoomsTab" style={containerStyle}>

            <div style={{width:this.state.siderWidth,
                top:"0", bottom:"0",left:"0",position:"absolute"}}>

            <Layout.Sider collapsible collapsed={this.state.siderWidth == 0}
                             trigger={null}
                          className="activeRoomsSider"
                          width={this.state.siderWidth}
                             collapsedWidth={0}
                             theme="light"
                          style={{backgroundColor: '#f8f8f8',
                              overflowY:"auto",
                              overflowX:"hidden",
                              overflowWrap:"break-word",
                              height:"100%",
                              boxSizing:  "border-box",
                              width: this.state.siderWidth}}>

            <div id="sidepopoutcontainer" style={{
                // height: '100vh',
                // margin: '0 0 0 auto',
                // // zIndex: "5",
                // // right: 0
                // backgroundColor: 'white',
                // overflow: 'hidden',
                // width: "350px",
                // // height: '100vh'
            }}>
                {this.props.auth.watchParty ? <></> : <ContextualActiveUsers collapsed={this.state.siderWidth == 0}/>}


                </div>
        </Layout.Sider>

            </div>
                {/*<div className="dragIconTop" onMouseDown={e => handleMouseDown(e)}></div>*/}
                <div className="dragIconMiddle"
                     onClick={() => {
                         localStorage.setItem("lobbyWidth", (this.state.siderWidth == 0 ? 250 : -1));
                         this.props.setWidth((this.state.siderWidth == 0 ? 250 : 10));

                         this.setState((prevState) => ({siderWidth: prevState.siderWidth == 0 ? 250 : 0}))
                     }}
            >
                {this.state.siderWidth == 0 ? <Tooltip mouseEnterDelay={0.5} title="Collapse the lobby drawer"><ChevronRightIcon/></Tooltip>:<Tooltip mouseEnterDelay={0.5} title="Expand the lobby drawer"><ChevronLeftIcon/></Tooltip>}
                {/*<Button className="collapseButton"><ChevronLeftIcon /></Button>*/}
            </div>

            <div className="roomDragger" onMouseDown={e => handleMouseDown(e)} ></div>

            {/*<div className="dragIconBottom" onMouseDown={e => handleMouseDown(e)}></div>*/}
            </div>
    }
}
const AuthConsumer = (props) => (
    // <Router.Consumer>
    //     {router => (
            <AuthUserContext.Consumer>
                {value => (
                    <SocialTab {...props} auth={value}/>
                )}
            </AuthUserContext.Consumer>
    // )}</Router.Consumer>

);

export default AuthConsumer;
