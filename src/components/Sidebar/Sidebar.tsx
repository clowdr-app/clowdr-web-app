import React from 'react';
import './Sidebar.scss';
import useConference from '../../hooks/useConference';

interface Props {
}

function Sidebar(props: Props) {
    // const [state, setState] = useState<boolean>({});
    const conf = useConference();

    return <div className="sidebar">{conf.conferenceName}</div>;
}

export default Sidebar;
