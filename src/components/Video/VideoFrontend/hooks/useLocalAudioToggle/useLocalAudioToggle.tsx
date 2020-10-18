import { useCallback } from 'react';
import useIsTrackEnabled from '../useIsTrackEnabled/useIsTrackEnabled';
import useVideoContext from '../useVideoContext/useVideoContext';

export default function useLocalAudioToggle() {
    const { localAudioTrack: audioTrack } = useVideoContext();
    const isEnabled = useIsTrackEnabled(audioTrack);

    const toggleAudioEnabled = useCallback(() => {
        if (audioTrack) {
            audioTrack.isEnabled ? audioTrack.disable() : audioTrack.enable();
        }
    }, [audioTrack]);

    const stopAudio = useCallback(() => {
        if (audioTrack) {
            audioTrack.stop();
        }
    }, [audioTrack]);

    return { isEnabled, toggleAudioEnabled, stopAudio } as const;
}
