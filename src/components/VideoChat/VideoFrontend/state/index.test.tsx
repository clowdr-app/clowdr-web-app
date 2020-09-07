import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { TwilioError } from 'twilio-video';

import AppStateProvider, { useAppState } from './index';
import { MemoryRouter } from 'react-router-dom';

// @ts-ignore
window.fetch = jest.fn(() => Promise.resolve({ text: () => 'mockVideoToken' }));

const wrapper: React.FC = ({ children }) => <MemoryRouter><AppStateProvider>{children}</AppStateProvider></MemoryRouter>;

jest.useFakeTimers();

describe('the useAppState hook', () => {
    beforeEach(jest.clearAllMocks);
    beforeEach(() => (process.env = {} as any));

    it('should set an error', () => {
        const { result } = renderHook(useAppState, { wrapper });
        act(() => result.current.setError(new Error('testError') as TwilioError));
        expect(result.current.error!.message).toBe('testError');
    });

    it('should throw an error if used outside of AppStateProvider', () => {
        const { result } = renderHook(useAppState);
        expect(result.error.message).toEqual('useAppState must be used within the AppStateProvider');
    });

    // it('should get a token using the REACT_APP_TOKEN_ENDPOINT environment variable when avaiable', async () => {
    //     process.env.REACT_APP_TOKEN_ENDPOINT = 'http://test.com/api/token';

    //     const { result } = renderHook(useAppState, { wrapper });

    //     let token;
    //     await act(async () => {
    //         token = await result.current.getToken('testname', 'testroom');
    //     });

    //     expect(token).toBe('mockVideoToken');

    //     expect(window.fetch).toHaveBeenCalledWith('http://test.com/api/token?identity=testname&roomName=testroom', {
    //         headers: { map: {} },
    //     });
    // });

    // describe('the getToken function', () => {
    //     it('should set isFetching to true after getToken is called, and false after getToken succeeds', async () => {
    //         const { result, waitForNextUpdate } = renderHook(useAppState, { wrapper });

    //         expect(result.current.isFetching).toEqual(false);

    //         await act(async () => {
    //             result.current.getToken('test', 'test');
    //             await waitForNextUpdate();
    //             expect(result.current.isFetching).toEqual(true);
    //             jest.runOnlyPendingTimers();
    //             await waitForNextUpdate();
    //             expect(result.current.isFetching).toEqual(false);
    //         });
    //     });

    //     it('should set isFetching to true after getToken is called, and false after getToken succeeds', async () => {
    //         const { result, waitForNextUpdate } = renderHook(useAppState, { wrapper });

    //         expect(result.current.isFetching).toEqual(false);

    //         await act(async () => {
    //             await result.current.getToken('test', 'test').catch(() => { });
    //             await waitForNextUpdate();
    //             console.warn(`Testing isFetching is true: ${result.current.isFetching}`);
    //             expect(result.current.isFetching).toEqual(true);
    //             jest.runOnlyPendingTimers();
    //             await waitForNextUpdate();
    //             console.warn(`Testing isFetching is false: ${result.current.isFetching}`);
    //             expect(result.current.isFetching).toEqual(false);
    //         });
    //     });
    // });
});
