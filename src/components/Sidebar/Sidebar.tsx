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
        let sideBarHeading = <h1 aria-level={1}><Link to="/" aria-label="Conference homepage">{conf.name}</Link></h1>;
        let headerBar = <div className="sidebar-header">
            {sideBarButton}
            {sideBarHeading}
        </div>
        return <div className="sidebar">
            {headerBar}
            <div className="sidebar-scrollable">
                <div className="menu">
                        fsasdfaslkjh sa fhjkaslfdhljsakjlfkshlafk jlsaflkjashflk sjakjasl fkjlsadfkljasdf kljsdaflkjhsfl
                        lkasj asdkfhasdkjf ksjlafkljhsafkjhlsadkjlsadkjfsadklj sadklj sadklsdk ajs kalddsk lf
                        sf lkhjadfhljksadhfljksd lhj lkjshf alk jhf sdjklh sdaflkj sda fklj h
                </div>
                    
                <FooterLinks doLogout={mUser ? props.doLogout : undefined} />
            </div>
        </div>;
    }
    else {
        return sideBarButton;
    }
}

export default Sidebar;
