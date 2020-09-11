import React, { useState, useEffect } from 'react';
import './Sidebar.scss';
import useConference from '../../hooks/useConference';

interface Props {
}

function Sidebar(props: Props) {
    // const [state, setState] = useState<boolean>({});
    const conf = useConference();
    const [text, setText] = useState("Please log in to view the conference");

    useEffect(() => {
        async function updateText() {
            setText((await conf.loggedInText).value);
        };

        updateText().catch(() => { console.log("Logged in text not available - probably not logged in."); });
    });

    return <div className="sidebar"><h1>{conf.conferenceName}</h1>{text}</div>;
}

export default Sidebar;
