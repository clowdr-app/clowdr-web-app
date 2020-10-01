import React, { createContext, ReactNode } from 'react';
import {
    CreateLocalTrackOptions,
    ConnectOptions,
    LocalAudioTrack,
    LocalVideoTrack,
    Room,
    TwilioError,
} from 'twilio-video';
import { Callback, ErrorCallback } from '../../types';
import { SelectedParticipantProvider } from './useSelectedParticipant/useSelectedParticipant';

import AttachVisibilityHandler from './AttachVisibilityHandler/AttachVisibilityHandler';
import useHandleRoomDisconnectionErrors from './useHandleRoomDisconnectionErrors/useHandleRoomDisconnectionErrors';
import useHandleOnDisconnect from './useHandleOnDisconnect/useHandleOnDisconnect';
import useHandleTrackPublicationFailed from './useHandleTrackPublicationFailed/useHandleTrackPublicationFailed';
import useLocalTracks from './useLocalTracks/useLocalTracks';
import useRoom from './useRoom/useRoom';
import useHandleOnConnect from './useHandleOnConnect/useHandleOnConnect';

/*
 *  The hooks used by the VideoProvider component are different than the hooks found in the 'hooks/' directory. The hooks
 *  in the 'hooks/' directory can be used anywhere in a video application, and they can be used any number of times.
 *  the hooks in the 'VideoProvider/' directory are intended to be used by the VideoProvider component only. Using these hooks
 *  elsewhere in the application may cause problems as these hooks should not be used more than once in an application.
 */

export interface IVideoContext {
    room: Room;
    localTracks: (LocalAudioTrack | LocalVideoTrack)[];
    isConnecting: boolean;
    connect: (token: string) => Promise<void>;
    onError: ErrorCallback;
    onConnect?: Callback;
    onDisconnect: Callback;
    getLocalVideoTrack: (newOptions?: CreateLocalTrackOptions) => Promise<LocalVideoTrack>;
    getLocalAudioTrack: (deviceId?: string) => Promise<LocalAudioTrack>;
}

export const VideoContext = createContext<IVideoContext>(null!);

interface VideoProviderProps {
    options?: ConnectOptions;
    onError: ErrorCallback;
    onConnect?: Callback;
    onDisconnect?: Callback;
    children: ReactNode;
}

export function VideoProvider({
    options,
    children,
    onError = (err: any) => { },
    onConnect = () => { },
    onDisconnect = () => { },
}: VideoProviderProps) {
    const onErrorCallback = (error: TwilioError) => {
        // Ed Nutting: For some reason, testing expects onError to be called,
        //             and the test doesn't deal with the error being logged, so
        //             yes, this has to be `console.log` instead of
        //             `console.error`. See test 'the VideoProvider component'
        //             'should call the onError function when there is an error'
        console.log(`ERROR: ${error.message}`, error);
        onError(error);
    };

    // @ts-ignore
    const { localTracks, getLocalVideoTrack, getLocalAudioTrack } = useLocalTracks(onError);
    const { room, isConnecting, connect } = useRoom(localTracks, onErrorCallback, options);

    // Register onError and onDisconnect callback functions.
    useHandleRoomDisconnectionErrors(room, onError);
    useHandleTrackPublicationFailed(room, onError);
    useHandleOnConnect(room, onConnect);
    useHandleOnDisconnect(room, onDisconnect);

    return (
        <VideoContext.Provider
            value={{
                room,
                localTracks,
                isConnecting,
                onError: onErrorCallback,
                onConnect,
                onDisconnect,
                getLocalVideoTrack,
                getLocalAudioTrack,
                connect,
            }}
        >
            <SelectedParticipantProvider room={room}>{children}</SelectedParticipantProvider>
            {/* 
        The AttachVisibilityHandler component is using the useLocalVideoToggle hook
        which must be used within the VideoContext Provider.
      */}
            <AttachVisibilityHandler />
        </VideoContext.Provider>
    );
}
