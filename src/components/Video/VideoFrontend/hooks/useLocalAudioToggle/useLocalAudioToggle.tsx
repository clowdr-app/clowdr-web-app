import { useCallback } from "react";
import LocalStorage_TwilioVideo from "../../../../../classes/LocalStorage/TwilioVideo";
import useIsTrackEnabled from "../useIsTrackEnabled/useIsTrackEnabled";
import useVideoContext from "../useVideoContext/useVideoContext";

export default function useLocalAudioToggle() {
    const { localAudioTrack: audioTrack } = useVideoContext();
    const isEnabled = useIsTrackEnabled(audioTrack);

    const toggleAudioEnabled = useCallback(() => {
        if (audioTrack) {
            if (audioTrack.isEnabled) {
                audioTrack.disable();
                LocalStorage_TwilioVideo.twilioVideoMicEnabled = false;
            } else {
                audioTrack.enable();
                LocalStorage_TwilioVideo.twilioVideoMicEnabled = true;
            }
        }
    }, [audioTrack]);

    const stopAudio = useCallback(() => {
        if (audioTrack) {
            audioTrack.stop();
        }
    }, [audioTrack]);

    return { isEnabled, toggleAudioEnabled, stopAudio } as const;
}
