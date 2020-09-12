import React from 'react';
import './Page.scss';
import useMaybeConference from '../../hooks/useMaybeConference';
import ConferenceSelection from '../Pages/ConferenceSelection/ConferenceSelection';
import Login, { doLoginF } from '../Pages/Login/Login';

interface Props {
    doLogin: doLoginF;
}

function Page(props: Props) {
    const mConf = useMaybeConference();

    return <div className="page">
        {mConf ? <Login doLogin={props.doLogin} /> : <ConferenceSelection />}
    </div>;
}

export default Page;
