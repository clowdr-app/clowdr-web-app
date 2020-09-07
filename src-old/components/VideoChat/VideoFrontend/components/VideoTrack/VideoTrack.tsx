import React, { useRef, useEffect, SyntheticEvent } from 'react';
import { IVideoTrack } from '../../types';
import { styled } from '@material-ui/core/styles';
import { Track } from 'twilio-video';

const Video = styled('video')({
    width: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
});

interface VideoTrackProps {
    track: IVideoTrack;
    isLocal?: boolean;
    priority?: Track.Priority | null;
    onLoad?: (event: SyntheticEvent) => void;
}

export default function VideoTrack({ track, isLocal, priority, onLoad }: VideoTrackProps) {
    const ref = useRef<HTMLVideoElement>(null!);

    useEffect(() => {
        const el = ref.current;
        el.muted = true;
        if (track.setPriority && priority) {
            track.setPriority(priority);
        }
        track.attach(el);
        return () => {
            track.detach(el);
            if (track.setPriority && priority) {
                // Passing `null` to setPriority will set the track's priority to that which it was published with.
                track.setPriority(null);
            }
        };
    }, [track, priority]);

    // The local video track is mirrored.
    const isFrontFacing = track.mediaStreamTrack.getSettings().facingMode !== 'environment';
    const style = isLocal && isFrontFacing ? { transform: 'rotateY(180deg)' } : {};

    return <Video ref={ref} style={style} onCanPlay={onLoad} />;
}
