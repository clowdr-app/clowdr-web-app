import { useCallback, useEffect, useState } from 'react';

import { ensureMediaPermissions } from '../../../utils';
import Video, { LocalVideoTrack, LocalAudioTrack, CreateLocalTrackOptions } from 'twilio-video';

export function useLocalAudioTrack(errorHandler?: (err: any) => {}) {
    const [track, setTrack] = useState<LocalAudioTrack>();

    const getLocalAudioTrack = useCallback((deviceId?: string) => {
        const options: CreateLocalTrackOptions = {};

        if (deviceId) {
            options.deviceId = { exact: deviceId };
        }

        return ensureMediaPermissions()
            .then(() =>
                Video.createLocalAudioTrack(options).then(newTrack => {
                    setTrack(newTrack);
                    return newTrack;
                })
            )
            .catch(err => {
                if (errorHandler) errorHandler(err);
                throw err;
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        getLocalAudioTrack();
    }, [getLocalAudioTrack]);

    useEffect(() => {
        const handleStopped = () => setTrack(undefined);
        if (track) {
            track.on('stopped', handleStopped);
            return () => {
                track.off('stopped', handleStopped);
            };
        }

        return () => { };
    }, [track]);

    return [track, getLocalAudioTrack] as const;
}

export function useLocalVideoTrack(errorHandler?: (err: any) => {}) {
    const [track, setTrack] = useState<LocalVideoTrack>();

    const getLocalVideoTrack = useCallback((newOptions?: CreateLocalTrackOptions) => {
        // In the DeviceSelector and FlipCameraButton components, a new video track is created,
        // then the old track is unpublished and the new track is published. Unpublishing the old
        // track and publishing the new track at the same time sometimes causes a conflict when the
        // track name is 'camera', so here we append a timestamp to the track name to avoid the
        // conflict.
        const options: CreateLocalTrackOptions = {
            frameRate: 24,
            height: 480,
            width: 640,
            name: `camera-${Date.now()}`,
            ...newOptions,
        };

        return ensureMediaPermissions()
            .then(() =>
                Video.createLocalVideoTrack(options).then(newTrack => {
                    setTrack(newTrack);
                    return newTrack;
                })
            )
            .catch(err => {
                if (errorHandler) errorHandler(err);
                console.log(err);
                throw err;
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // We get a new local video track when the app loads.
        getLocalVideoTrack();
    }, [getLocalVideoTrack]);

    useEffect(() => {
        const handleStopped = () => setTrack(undefined);
        if (track) {
            track.on('stopped', handleStopped);
            return () => {
                track.off('stopped', handleStopped);
            };
        }

        return () => { };
    }, [track]);

    return [track, getLocalVideoTrack] as const;
}

export default function useLocalTracks(errorHandler?: (err: any) => {}) {
    const [audioTrack, getLocalAudioTrack] = useLocalAudioTrack(errorHandler);
    const [videoTrack, getLocalVideoTrack] = useLocalVideoTrack(errorHandler);

    const localTracks = [audioTrack, videoTrack].filter(track => track !== undefined) as (
        | LocalAudioTrack
        | LocalVideoTrack
    )[];

    return { localTracks, getLocalVideoTrack, getLocalAudioTrack };
}
