import { useCallback, useState } from "react";
import useVideoContext from "../useVideoContext/useVideoContext";
import LocalStorage_TwilioVideo from "../../../../../classes/LocalStorage/TwilioVideo";

export default function useLocalVideoToggle() {
    const {
        room: { localParticipant },
        localVideoTrack: videoTrack,
        getLocalVideoTrack,
        removeLocalVideoTrack,
    } = useVideoContext();
    const [isPublishing, setIsPublishing] = useState(false);

    const stopVideo = useCallback(() => {
        if (videoTrack) {
            LocalStorage_TwilioVideo.twilioVideoLastCamera = videoTrack.mediaStreamTrack.getSettings().deviceId ?? null;
            const localTrackPublication = localParticipant?.unpublishTrack(videoTrack);
            // TODO: remove when SDK implements this event. See: https://issues.corp.twilio.com/browse/JSDK-2592
            localParticipant?.emit("trackUnpublished", localTrackPublication);
            removeLocalVideoTrack();
        }
    }, [localParticipant, removeLocalVideoTrack, videoTrack]);

    const toggleVideoEnabled = useCallback(async () => {
        if (!isPublishing) {
            if (videoTrack) {
                stopVideo();
                LocalStorage_TwilioVideo.twilioVideoCameraEnabled = false;
            } else {
                setIsPublishing(true);
                try {
                    LocalStorage_TwilioVideo.twilioVideoCameraEnabled = true;
                    const lastCamera = LocalStorage_TwilioVideo.twilioVideoLastCamera;
                    const track = lastCamera
                        ? await getLocalVideoTrack({
                              deviceId: { exact: lastCamera },
                          })
                        : await getLocalVideoTrack();
                    localParticipant?.publishTrack(track, { priority: "low" });
                } catch (e) {
                    // If the device is not readable (probably in use by another app), don't try to
                    // use it next time.
                    if (e?.name === "NotReadableError") {
                        LocalStorage_TwilioVideo.twilioVideoLastCamera = null;
                    }
                    throw e;
                } finally {
                    setIsPublishing(false);
                }
            }
        }
    }, [isPublishing, videoTrack, stopVideo, getLocalVideoTrack, localParticipant]);

    return { isEnabled: !!videoTrack, toggleVideoEnabled, stopVideo } as const;
}
