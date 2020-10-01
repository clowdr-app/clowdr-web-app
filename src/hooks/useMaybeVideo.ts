import { useContext } from 'react';
import VideoContext from '../contexts/VideoContext';

/**
 * Use this hook to access the video instance.
 */
export default function useMaybeVideo() {
    return useContext(VideoContext);
}
