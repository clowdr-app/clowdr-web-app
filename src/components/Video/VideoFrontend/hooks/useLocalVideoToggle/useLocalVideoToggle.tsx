import { LocalVideoTrack } from 'twilio-video';
import { useCallback, useRef, useState } from 'react';
import useVideoContext from '../useVideoContext/useVideoContext';

export default function useLocalVideoToggle() {
    const {
        room: { localParticipant },
        localVideoTrack: videoTrack,
        getLocalVideoTrack,
        removeLocalVideoTrack,
        onError,
    } = useVideoContext();
    const [isPublishing, setIspublishing] = useState(false);
    const previousDeviceIdRef = useRef<string>();

    const stopVideo = useCallback(() => {
        if (videoTrack) {
            previousDeviceIdRef.current = videoTrack.mediaStreamTrack.getSettings().deviceId;
            const localTrackPublication = localParticipant?.unpublishTrack(videoTrack);
            // TODO: remove when SDK implements this event. See: https://issues.corp.twilio.com/browse/JSDK-2592
            localParticipant?.emit('trackUnpublished', localTrackPublication);
            removeLocalVideoTrack();
        }
    }, [localParticipant, removeLocalVideoTrack, videoTrack]);

    const toggleVideoEnabled = useCallback(() => {
        if (!isPublishing) {
            if (videoTrack) {
                stopVideo();
            } else {
                setIspublishing(true);
                getLocalVideoTrack({ deviceId: { exact: previousDeviceIdRef.current } })
                    .then((track: LocalVideoTrack) => localParticipant?.publishTrack(track, { priority: 'low' }))
                    .catch(onError)
                    .finally(() => setIspublishing(false));
            }
        }
    }, [isPublishing, videoTrack, stopVideo, getLocalVideoTrack, onError, localParticipant]);

    return { isEnabled: !!videoTrack, toggleVideoEnabled, stopVideo } as const;
}
