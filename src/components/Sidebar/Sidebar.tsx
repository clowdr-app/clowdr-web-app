import React from 'react';
import './Sidebar.scss';
import useConference from '../../hooks/useConference';

interface Props {
    open: boolean,
    toggleSidebar?: () => void
}

function Sidebar(props: Props) {
    let conf = useConference();

    let sideBarButton = <div className="sidebar-button">
        <button aria-label="Open Menu" onClick={props.toggleSidebar} className={props.open ? " change" : ""}>
            <div className="bar1"></div>
            <div className="bar2"></div>
            <div className="bar3"></div>
        </button>
    </div>;

    if (props.open) {
        let sideBarHeading = <h1 aria-level={1}>{conf.conferenceName}</h1>;

        let headerBar = <div className="sidebar-header">
            {sideBarButton}
            {sideBarHeading}
        </div>
        return <div className="sidebar">
            {headerBar}
        </div>;
    }
    else {
        return sideBarButton;
    }
}

export default Sidebar;
