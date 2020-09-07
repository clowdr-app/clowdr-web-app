import React from 'react';
import './Sidebar.scss';
import useConference from '../../hooks/useConference';

interface ISidebarProps {
}

interface ISidebarState {
}

function Sidebar(props: ISidebarProps) {
    // const [state, setState] = useState<ISidebarState>({});
    const conf = useConference();

    return <div className="sidebar">{conf.conferenceName}</div>;
}

export default Sidebar;
