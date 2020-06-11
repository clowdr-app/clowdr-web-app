import React, {Component} from "react";
import {Button, Layout, Tooltip} from "antd";
import ContextualActiveUsers from "../Lobby/ContextualActiveusers";
import {AuthUserContext} from "../Session";
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
class SocialTab extends Component {
    constructor(props) {
        super(props);
        this.state = {siderCollapsed: this.props.collapsed}
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if(this.props.collapsed != this.state.siderCollapsed){
          this.setState({siderCollapsed: this.props.collapsed, siderWidth: 250})
        }
    }
    setDrawerWidth(width){
        this.setState({siderWidth: width})
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
                    <ContextualActiveUsers collapsed={this.state.siderWidth == 0}/>


                </div>
        </Layout.Sider>
            {/*<div className="dragIconTop" onMouseDown={e => handleMouseDown(e)}></div>*/}
            <div className="dragIconMiddle"
                 onClick={()=>this.setState((prevState)=>({siderWidth: prevState.siderWidth == 0 ? 250 : 0}))}
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
