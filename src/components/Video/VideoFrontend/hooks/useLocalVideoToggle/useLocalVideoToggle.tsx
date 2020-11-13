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
                    const track = await getLocalVideoTrack({
                        deviceId: { exact: LocalStorage_TwilioVideo.twilioVideoLastCamera ?? undefined },
                    });
                    localParticipant?.publishTrack(track, { priority: "low" });
                } catch (e) {
                    throw e;
                } finally {
                    setIsPublishing(false);
                }
            }
        }
    }, [isPublishing, videoTrack, stopVideo, getLocalVideoTrack, localParticipant]);

    return { isEnabled: !!videoTrack, toggleVideoEnabled, stopVideo } as const;
}
