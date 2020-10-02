import { LocalVideoTrack } from 'twilio-video';
import { useCallback } from 'react';
import useVideoContext from '../useVideoContext/useVideoContext';

export default function useLocalVideoToggle() {
    const {
        room: { localParticipant },
        localTracks,
        getLocalVideoTrack,
    } = useVideoContext();
    const videoTrack = localTracks.find(track => track.name.includes('camera')) as LocalVideoTrack;

    const toggleVideoEnabled = useCallback(() => {
        if (videoTrack) {
            if (localParticipant) {
                const localTrackPublication = localParticipant.unpublishTrack(videoTrack);
                // TODO: remove when SDK implements this event. See: https://issues.corp.twilio.com/browse/JSDK-2592
                localParticipant.emit('trackUnpublished', localTrackPublication);
            }
            videoTrack.stop();
        } else {
            const p = getLocalVideoTrack();
            p.promise.then((track: LocalVideoTrack | undefined) => {
                if (localParticipant && track) {
                    localParticipant.publishTrack(track, { priority: 'low' });
                }
            });
            return p.cancel;
        }
        return () => { };
    }, [videoTrack, localParticipant, getLocalVideoTrack]);

    return [!!videoTrack, toggleVideoEnabled] as const;
}
