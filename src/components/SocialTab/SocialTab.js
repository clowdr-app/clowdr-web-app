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
        this.state = {siderCollapsed: this.props.collapsed, siderWidth: siderWidth}
    }
    componentWillUnmount() {
    }

    setDrawerWidth(width){
        this.setState({siderWidth: width})
        localStorage.setItem("lobbyWidth", (width == 0 ? -1 : width));
    }

    render() {
        let topHeight = 0;
        let topElement = document.getElementById("top-content");
        if(topElement)
            topHeight = topElement.clientHeight;

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
            if (newWidth >= 0 && newWidth <= 300)
                this.setDrawerWidth(newWidth);
        };
        let containerStyle = {position: 'relative', height:'100%'};
        if(this.state.siderWidth <5){
            containerStyle.width="10px";
        }
        return <div className="activeRoomsTab">

            <div style={containerStyle}>
            <Layout.Sider collapsible collapsed={this.state.siderWidth == 0}
                             trigger={null}
                          className="activeRoomsSider"
                          width={this.state.siderWidth}
                             collapsedWidth={0}
                             theme="light"
                             style={{backgroundColor: '#f8f8f8', height: "100%"}}>
            <div id="sidepopoutcontainer" style={{
                overflowY: "auto"
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
                {/*<div className="dragIconTop" onMouseDown={e => handleMouseDown(e)}></div>*/}
                <div className="dragIconMiddle"
                     onClick={() => {
                         localStorage.setItem("lobbyWidth", (this.state.siderWidth == 0 ? 250 : -1));
                         this.setState((prevState) => ({siderWidth: prevState.siderWidth == 0 ? 250 : 0}))
                     }}
            >
                {this.state.siderWidth == 0 ? <Tooltip title="Collapse the lobby drawer"><ChevronRightIcon/></Tooltip>:<Tooltip title="Expand the lobby drawer"><ChevronLeftIcon/></Tooltip>}
                {/*<Button className="collapseButton"><ChevronLeftIcon /></Button>*/}
            </div>

            <div className="roomDragger" onMouseDown={e => handleMouseDown(e)} ></div>

            {/*<div className="dragIconBottom" onMouseDown={e => handleMouseDown(e)}></div>*/}
            </div>
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
