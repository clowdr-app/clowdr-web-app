import React, { useCallback, useEffect, useState } from 'react';
import FlipCameraIosIcon from '@material-ui/icons/FlipCameraIos';
import { IconButton } from '@material-ui/core';
import useVideoContext from '../../../hooks/useVideoContext/useVideoContext';

export default function FlipCameraButton() {
    const {
        room: { localParticipant },
        localTracks,
        getLocalVideoTrack,
    } = useVideoContext();
    const [supportsFacingMode, setSupportsFacingMode] = useState<boolean | null>(null);
    const videoTrack = localTracks.find(track => track.name.includes('camera'));
    const facingMode = videoTrack?.mediaStreamTrack.getSettings().facingMode;

    useEffect(() => {
        // The 'supportsFacingMode' variable determines if this component is rendered
        // If 'facingMode' exists, we will set supportsFacingMode to true.
        // However, if facingMode is ever undefined again (when the user unpublishes video), we
        // won't set 'supportsFacingMode' to false. This prevents the icon from briefly
        // disappearing when the user switches their front/rear camera.
        if (facingMode && supportsFacingMode === null) {
            setSupportsFacingMode(Boolean(facingMode));
        }
    }, [facingMode, supportsFacingMode]);

    const toggleFacingMode = useCallback(() => {
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';

        videoTrack!.stop();

        const p = getLocalVideoTrack({ facingMode: newFacingMode });
        p.promise.then(newVideoTrack => {
            const localTrackPublication = localParticipant?.unpublishTrack(videoTrack!);
            // TODO: remove when SDK implements this event. See: https://issues.corp.twilio.com/browse/JSDK-2592
            localParticipant?.emit('trackUnpublished', localTrackPublication);

            if (newVideoTrack) {
                localParticipant?.publishTrack(newVideoTrack, { priority: 'low' });
            }
        });
        return p.cancel;
    }, [facingMode, getLocalVideoTrack, localParticipant, videoTrack]);

    return supportsFacingMode ? (
        <IconButton onClick={toggleFacingMode} disabled={!videoTrack}>
            <FlipCameraIosIcon />
        </IconButton>
    ) : null;
}