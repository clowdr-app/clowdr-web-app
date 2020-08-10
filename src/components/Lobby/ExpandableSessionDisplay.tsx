import React from 'react';
import {ClowdrState} from "../../ClowdrTypes";
import ProgramSession from "../../classes/ProgramSession"
import {AuthUserContext} from '../Session';
import ProgramItem from "../../classes/ProgramItem";
import { Collapse } from 'antd';
import ProgramItemDisplay from "../Program/ProgramItemDisplay";

interface ExpandableSessionDisplayProps {
    auth: ClowdrState | null;
    session: ProgramSession;
}

interface ExpandableSessionDisplayState {
    loading: Boolean,
    ProgramItems: ProgramItem[],
}

class ExpandableSessionDisplay extends React.Component<ExpandableSessionDisplayProps, ExpandableSessionDisplayState> {
    constructor(props: ExpandableSessionDisplayProps) {
        super(props);
        this.state = {
            loading: true,
            ProgramItems: []
        }
    }

    render(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | string | number | {} | React.ReactNodeArray | React.ReactPortal | boolean | null | undefined {
        return <Collapse className="program-session-collapse"><Collapse.Panel key={this.props.session.id} header={this.props.session.get("title")}>
                {this.props.session.get('items') ? this.props.session.get('items').map((item: ProgramItem)=>{
                    return <div key={item.id}>
                        <ProgramItemDisplay id={item.id} auth={this.props.auth} showBreakoutRoom={true}/>
                    </div>
                }) : <></>}
        </Collapse.Panel></Collapse>
    }
}
interface PublicExpandableSessionDisplayProps{
    session: ProgramSession;
}
const AuthConsumer = (props: PublicExpandableSessionDisplayProps) => (
    // <Router.Consumer>
    //     {router => (
    <AuthUserContext.Consumer>
        {value => (
            <ExpandableSessionDisplay session={props.session} auth={value}/>
        )}
    </AuthUserContext.Consumer>
// )}</Router.Consumer>

);

export default AuthConsumer;