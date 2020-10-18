import React, { useState, useEffect } from 'react';
import DeviceSelectionScreen from './DeviceSelectionScreen/DeviceSelectionScreen';
import MediaErrorSnackbar from './MediaErrorSnackbar/MediaErrorSnackbar';
import useVideoContext from '../../hooks/useVideoContext/useVideoContext';
import IntroContainer from '../IntroContainer/IntroContainer';
import { VideoRoom } from '@clowdr-app/clowdr-db-schema';

export enum Steps {
    deviceSelectionStep,
}

export default function PreJoinScreens(props: {
    room: VideoRoom
}) {
    const { getAudioAndVideoTracks } = useVideoContext();
    const [step, setStep] = useState(Steps.deviceSelectionStep);

    const [mediaError, setMediaError] = useState<Error>();

    useEffect(() => {
        if (step === Steps.deviceSelectionStep) {
            getAudioAndVideoTracks().catch(error => {
                // tslint:disable-next-line:no-console
                console.log('Error acquiring local media:');
                // tslint:disable-next-line:no-console
                console.dir(error);
                setMediaError(error);
            });
        }
    }, [getAudioAndVideoTracks, step]);

    const SubContent = (
        <>
            <MediaErrorSnackbar error={mediaError} />
        </>
    );

    return (
        <IntroContainer subContent={step === Steps.deviceSelectionStep && SubContent}>
            {step === Steps.deviceSelectionStep && (
                <DeviceSelectionScreen room={props.room} setStep={setStep} />
            )}
        </IntroContainer>
    );
}
