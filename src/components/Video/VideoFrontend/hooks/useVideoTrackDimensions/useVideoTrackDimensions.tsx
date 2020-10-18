import { useState, useEffect } from 'react';
import { LocalVideoTrack, RemoteVideoTrack } from 'twilio-video';

type TrackType = LocalVideoTrack | RemoteVideoTrack;

export default function useVideoTrackDimensions(track?: TrackType) {
    const [dimensions, setDimensions] = useState(track?.dimensions);

    useEffect(() => {
        setDimensions(track?.dimensions);

        if (track) {
            const handleDimensionsChanged = (_track: TrackType) => setDimensions(_track?.dimensions);
            track.on('dimensionsChanged', handleDimensionsChanged);
            return () => {
                track.off('dimensionsChanged', handleDimensionsChanged);
            };
        }
        return () => { };
    }, [track]);

    return dimensions;
}
