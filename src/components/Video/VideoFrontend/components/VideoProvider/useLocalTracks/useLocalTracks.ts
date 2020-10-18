import { DEFAULT_VIDEO_CONSTRAINTS } from '../../../constants';
import { useCallback, useState } from 'react';
import Video, { LocalVideoTrack, LocalAudioTrack, CreateLocalTrackOptions } from 'twilio-video';
import { useHasAudioInputDevices, useHasVideoInputDevices } from '../../../hooks/deviceHooks/deviceHooks';

export default function useLocalTracks() {
    const [audioTrack, setAudioTrack] = useState<LocalAudioTrack>();
    const [videoTrack, setVideoTrack] = useState<LocalVideoTrack>();
    const [isAcquiringLocalTracks, setIsAcquiringLocalTracks] = useState(false);

    const hasAudio = useHasAudioInputDevices();
    const hasVideo = useHasVideoInputDevices();

    const getLocalAudioTrack = useCallback((deviceId?: string) => {
        const options: CreateLocalTrackOptions = {};

        if (deviceId) {
            options.deviceId = { exact: deviceId };
        }

        return Video.createLocalAudioTrack(options).then(newTrack => {
            setAudioTrack(newTrack);
            return newTrack;
        });
    }, []);

    const getLocalVideoTrack = useCallback((newOptions?: CreateLocalTrackOptions) => {
        const options: CreateLocalTrackOptions = {
            ...(DEFAULT_VIDEO_CONSTRAINTS as {}),
            name: `camera-${Date.now()}`,
            ...newOptions,
        };

        return Video.createLocalVideoTrack(options).then(newTrack => {
            setVideoTrack(newTrack);
            return newTrack;
        });
    }, []);

    const removeLocalVideoTrack = useCallback(() => {
        if (videoTrack) {
            videoTrack.stop();
            setVideoTrack(undefined);
        }
    }, [videoTrack]);

    const getAudioAndVideoTracks = useCallback(() => {
        if (!hasAudio && !hasVideo) return Promise.resolve();
        if (audioTrack || videoTrack) return Promise.resolve();

        setIsAcquiringLocalTracks(true);
        return Video.createLocalTracks({
            video: hasVideo && {
                ...(DEFAULT_VIDEO_CONSTRAINTS as {}),
                name: `camera-${Date.now()}`,
            },
            audio: hasAudio,
        })
            .then(tracks => {
                const _videoTrack = tracks.find(track => track.kind === 'video');
                const _audioTrack = tracks.find(track => track.kind === 'audio');
                if (_videoTrack) {
                    setVideoTrack(_videoTrack as LocalVideoTrack);
                }
                if (_audioTrack) {
                    setAudioTrack(_audioTrack as LocalAudioTrack);
                }
            })
            .finally(() => setIsAcquiringLocalTracks(false));
    }, [hasAudio, hasVideo, audioTrack, videoTrack]);

    return {
        audioTrack,
        videoTrack,
        getLocalVideoTrack,
        getLocalAudioTrack,
        isAcquiringLocalTracks,
        removeLocalVideoTrack,
        getAudioAndVideoTracks,
    };
}
