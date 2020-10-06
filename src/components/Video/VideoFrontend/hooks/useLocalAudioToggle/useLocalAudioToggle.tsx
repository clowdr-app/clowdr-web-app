import { LocalAudioTrack } from 'twilio-video';
import { useCallback } from 'react';
import useIsTrackEnabled from '../useIsTrackEnabled/useIsTrackEnabled';
import useVideoContext from '../useVideoContext/useVideoContext';

export default function useLocalAudioToggle() {
    const { localTracks } = useVideoContext();
    const audioTrack = localTracks.find(track => track.kind === 'audio') as LocalAudioTrack;
    const isEnabled = useIsTrackEnabled(audioTrack);

    const toggleAudioEnabled = useCallback((enable?: boolean) => {
        if (audioTrack) {
            if (enable !== undefined) {
                if (enable) {
                    audioTrack.enable()
                }
                else {
                    audioTrack.disable();
                }
            }
            else {
                if (audioTrack.isEnabled) {
                    audioTrack.disable()
                }
                else {
                    audioTrack.enable();
                }
            }
        }
    }, [audioTrack]);

    return [isEnabled, toggleAudioEnabled] as const;
}
