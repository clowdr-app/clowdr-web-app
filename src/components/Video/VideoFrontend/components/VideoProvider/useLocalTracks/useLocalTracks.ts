import { useCallback, useEffect, useState } from 'react';

import { ensureMediaPermissions } from '../../../utils';
import Video, { LocalVideoTrack, LocalAudioTrack, CreateLocalTrackOptions } from 'twilio-video';
import { makeCancelable } from '@clowdr-app/clowdr-db-schema/build/Util';

export function useLocalAudioTrack(errorHandler?: (err: any) => {}) {
    const [track, setTrack] = useState<LocalAudioTrack>();

    const getLocalAudioTrack = useCallback((deviceId?: string) => {
        const options: CreateLocalTrackOptions = {};

        if (deviceId) {
            options.deviceId = { exact: deviceId };
        }

        const p = makeCancelable(ensureMediaPermissions().then(() => Video.createLocalAudioTrack(options)));
        p.promise
            .then(newTrack => {
                setTrack(newTrack);
                return newTrack;
            })
            .catch(err => {
                if (!err.isCanceled) {
                    if (errorHandler)
                        errorHandler(err);
                    throw err;
                }
                return undefined;
            });
        return p;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        return getLocalAudioTrack().cancel;
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

        const p = makeCancelable(ensureMediaPermissions().then(() => Video.createLocalVideoTrack(options)));
        p.promise
            .then(newTrack => {
                setTrack(newTrack);
                return newTrack;
            })
            .catch(err => {
                if (!err.isCanceled) {
                    if (errorHandler)
                        errorHandler(err);
                    throw err;
                }
                return undefined;
            });
        return p;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // We get a new local video track when the app loads.
        return getLocalVideoTrack().cancel;
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
