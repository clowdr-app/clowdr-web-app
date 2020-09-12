import React, { useState, useEffect } from 'react';
import './Page.scss';
import useMaybeConference from '../../hooks/useMaybeConference';
import useMaybeUser from '../../hooks/useMaybeUserProfile';
import useLogger from '../../hooks/useLogger';
import ConferenceSelection from '../Pages/ConferenceSelection/ConferenceSelection';
import Login from '../Pages/Login/Login';

interface Props {
}

function Page(props: Props) {
    const mConf = useMaybeConference();
    const mUser = useMaybeUser();
    const logger = useLogger("Page");

    return <div className="page">
        {mConf ? <Login /> : <ConferenceSelection />}
    </div>;
}

export default Page;
