import { LocalVideoTrack } from 'twilio-video';
import { useCallback, useState } from 'react';
import useVideoContext from '../useVideoContext/useVideoContext';
import LocalStorage_TwilioVideo from '../../../../../classes/LocalStorage/TwilioVideo';

export default function useLocalVideoToggle() {
    const {
        room: { localParticipant },
        localVideoTrack: videoTrack,
        getLocalVideoTrack,
        removeLocalVideoTrack,
        onError,
    } = useVideoContext();
    const [isPublishing, setIspublishing] = useState(false);

    const stopVideo = useCallback(() => {
        if (videoTrack) {
            LocalStorage_TwilioVideo.twilioVideoLastCamera = videoTrack.mediaStreamTrack.getSettings().deviceId ?? null;
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
                LocalStorage_TwilioVideo.twilioVideoCameraEnabled = false;
            } else {
                setIspublishing(true);
                LocalStorage_TwilioVideo.twilioVideoCameraEnabled = true;
                getLocalVideoTrack({ deviceId: { exact: LocalStorage_TwilioVideo.twilioVideoLastCamera ?? undefined } })
                    .then((track: LocalVideoTrack) => localParticipant?.publishTrack(track, { priority: 'low' }))
                    .catch(onError)
                    .finally(() => setIspublishing(false));
            }
        }
    }, [isPublishing, videoTrack, stopVideo, getLocalVideoTrack, onError, localParticipant]);

    return { isEnabled: !!videoTrack, toggleVideoEnabled, stopVideo } as const;
}
