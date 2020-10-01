import React, { createContext, useContext, useState } from 'react';
import { TwilioError } from 'twilio-video';
import { useLocation } from 'react-router-dom';

export interface StateContextType {
    error: TwilioError | null;
    setError(error: TwilioError | null): void;
    getToken(name: string, room: string, passcode?: string): Promise<string>;
    user?: null | { displayName: undefined; photoURL: undefined; passcode?: string };
    signIn?(passcode?: string): Promise<void>;
    signOut?(): Promise<void>;
    isAuthReady?: boolean;
    isFetching: boolean;
    activeSinkId: string;
    setActiveSinkId(sinkId: string): void;
    meeting?: string;
    token?: string;
    isEmbedded?: boolean;
}

export const StateContext = createContext<StateContextType>(null!);

export interface AppStateProvider {
    meeting?: string;
    token?: string;
    isEmbedded?: boolean;
}
function useQuery() {
    return new URLSearchParams(useLocation().search);
}

/*
  The 'react-hooks/rules-of-hooks' linting rules prevent React Hooks fron being called
  inside of if() statements. This is because hooks must always be called in the same order
  every time a component is rendered. The 'react-hooks/rules-of-hooks' rule is disabled below
  because the "if (process.env.REACT_APP_SET_AUTH === 'firebase')" statements are evaluated
  at build time (not runtime). If the statement evaluates to false, then the code is not
  included in the bundle that is produced (due to tree-shaking). Thus, in this instance, it
  is ok to call hooks inside if() statements.
*/
export default function AppStateProvider(props: React.PropsWithChildren<AppStateProvider>) {
    const [error, setError] = useState<TwilioError | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [activeSinkId, setActiveSinkId] = useState('default');

    let contextValue = {
        error,
        setError,
        isFetching,
        activeSinkId,
        setActiveSinkId,
    } as StateContextType;

    if (props.isEmbedded) {
        contextValue = {
            ...contextValue,
            isEmbedded: props.isEmbedded,
        };
    }
    if (props.token && props.meeting) {
        contextValue = {
            ...contextValue,
            meeting: props.meeting,
            token: props.token,
        };
    }
    const query = useQuery();
    const roomId = query.get('roomId');
    const token = query.get('token');
    if (roomId && token) {
        contextValue = {
            ...contextValue,
            meeting: roomId,
            token,
        };
    }

    contextValue = {
        ...contextValue,
        getToken: async (identity, roomName) => {
            const headers = new window.Headers();
            const endpoint = process.env.REACT_APP_TOKEN_ENDPOINT || '/token';
            const params = new window.URLSearchParams({ identity, roomName });

            return fetch(`${endpoint}?${params}`, { headers }).then(res => res.text());
        },
    };

    const getToken: StateContextType['getToken'] = (name, room) => {
        setIsFetching(true);
        return contextValue
            .getToken(name, room)
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
