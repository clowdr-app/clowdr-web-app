import React from 'react';
import Video from '../classes/Video/Video';

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useVideo` hook.
 */
const Context = React.createContext<Video | null>(null);

export default Context;
