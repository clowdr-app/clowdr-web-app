import React from 'react';
import './Sidebar.scss';
import useConference from '../../hooks/useConference';

interface Props {
}

function Sidebar(props: Props) {
    useConference();
    return <div className="sidebar"></div>;
}

export default Sidebar;
