import React from 'react';
import './Page.scss';
import useMaybeConference from '../../hooks/useMaybeConference';
import ConferenceSelection from '../Pages/ConferenceSelection/ConferenceSelection';
import Login from '../Pages/Login/Login';

interface Props {
}

function Page(props: Props) {
    const mConf = useMaybeConference();

    return <div className="page">
        {mConf ? <Login /> : <ConferenceSelection />}
    </div>;
}

export default Page;
