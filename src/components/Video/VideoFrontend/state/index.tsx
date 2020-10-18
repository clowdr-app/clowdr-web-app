import React, { createContext, useContext, useReducer, useState } from 'react';
import { RoomType } from '../types';
import { TwilioError } from 'twilio-video';
import { settingsReducer, initialSettings, Settings, SettingsAction } from './settings/settingsReducer';
import useMaybeVideo from '../../../../hooks/useMaybeVideo';
import { VideoRoom } from '@clowdr-app/clowdr-db-schema';
import assert from 'assert';

export interface StateContextType {
    error: TwilioError | null;
    setError(error: TwilioError | null): void;
    getToken(room: VideoRoom): Promise<{
        token: string | null,
        expiry: Date | null,
        twilioRoomId: string | null
    }>;
    isAuthReady?: boolean;
    isFetching: boolean;
    activeSinkId: string;
    setActiveSinkId(sinkId: string): void;
    settings: Settings;
    dispatchSetting: React.Dispatch<SettingsAction>;
    roomType?: RoomType;
}

export const StateContext = createContext<StateContextType>(null!);

/*
  The 'react-hooks/rules-of-hooks' linting rules prevent React Hooks fron being called
  inside of if() statements. This is because hooks must always be called in the same order
  every time a component is rendered. The 'react-hooks/rules-of-hooks' rule is disabled below
  because the "if (process.env.REACT_APP_SET_AUTH === 'firebase')" statements are evaluated
  at build time (not runtime). If the statement evaluates to false, then the code is not
  included in the bundle that is produced (due to tree-shaking). Thus, in this instance, it
  is ok to call hooks inside if() statements.
*/
export default function AppStateProvider(props: React.PropsWithChildren<{}>) {
    const [error, setError] = useState<TwilioError | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [activeSinkId, setActiveSinkId] = useState('default');
    const [settings, dispatchSetting] = useReducer(settingsReducer, initialSettings);

    let contextValue = {
        error,
        setError,
        isFetching,
        activeSinkId,
        setActiveSinkId,
        settings,
        dispatchSetting,
    } as StateContextType;

    const mVideo = useMaybeVideo();
    contextValue = {
        ...contextValue,
        getToken: async (room) => {
            assert(mVideo);
            return await mVideo.fetchFreshToken(room);
        },
    };

    const getToken: StateContextType['getToken'] = (room) => {
        setIsFetching(true);
        return contextValue
            .getToken(room)
            .then(res => {
                setIsFetching(false);
                return res;
            })
            .catch(err => {
                setError(err);
                setIsFetching(false);
                return Promise.reject(err);
            });
    };

    return <StateContext.Provider value={{ ...contextValue, getToken }}>{props.children}</StateContext.Provider>;
}

export function useAppState() {
    const context = useContext(StateContext);
    if (!context) {
        throw new Error('useAppState must be used within the AppStateProvider');
    }
    return context;
}
