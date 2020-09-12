import React, { useState, useEffect } from 'react';
import './Page.scss';
import useMaybeConference from '../../hooks/useMaybeConference';
import useMaybeUser from '../../hooks/useMaybeUserProfile';
import useLogger from '../../hooks/useLogger';
import ConferenceSelection from '../Pages/ConferenceSelection/ConferenceSelection';

interface Props {
}

function Page(props: Props) {
    const conf = useMaybeConference();
    const mUser = useMaybeUser();
    const logger = useLogger("Page");

    return <div className="page">
        <ConferenceSelection />
    </div>;
}

export default Page;
