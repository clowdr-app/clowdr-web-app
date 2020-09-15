import React from 'react';
import './Sidebar.scss';
import useConference from '../../hooks/useConference';
import useMaybeUserProfile from '../../hooks/useMaybeUserProfile';
import FooterLinks from '../FooterLinks/FooterLinks';
import { Link } from 'react-router-dom';

interface Props {
    open: boolean,
    toggleSidebar?: () => void
    doLogout?: () => void
}

function Sidebar(props: Props) {
    let conf = useConference();
    let mUser = useMaybeUserProfile();

    let sideBarButton = <div className="sidebar-button">
        <button aria-label="Open Menu" onClick={props.toggleSidebar} className={props.open ? " change" : ""}>
            <div className="bar1"></div>
            <div className="bar2"></div>
            <div className="bar3"></div>
        </button>
    </div>;

    if (props.open) {
        let sideBarHeading = <h1 aria-level={1}><Link to="/" aria-label="Conference homepage">{conf.conferenceName}</Link></h1>;
        // Note: The wrapping div around the logout button is necessary for the
        // grid layout to work.
        let logoutButton
            = mUser
                ? <div className="signout">
                    <button onClick={props.doLogout} aria-label="Sign out">Sign out</button>
                  </div>
                : <></>;

        let headerBar = <div className="sidebar-header">
            {sideBarButton}
            {sideBarHeading}
            {logoutButton}
        </div>
        return <div className="sidebar">
            {headerBar}
            <FooterLinks />
        </div>;
    }
    else {
        return sideBarButton;
    }
}

export default Sidebar;
