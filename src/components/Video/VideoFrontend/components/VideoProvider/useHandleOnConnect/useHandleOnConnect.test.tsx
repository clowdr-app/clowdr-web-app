import { act, renderHook } from '@testing-library/react-hooks';
import EventEmitter from 'events';
import { Room } from 'twilio-video';

import useHandleOnConnect from './useHandleOnConnect';

describe('the useHandleonConnect hook', () => {
    let mockRoom: any = new EventEmitter.EventEmitter();

    it('should react to the rooms "connected" event and invoke onConnect callback', () => {
        const mockOnConnect = jest.fn();
        renderHook(() => useHandleOnConnect(mockRoom, mockOnConnect));
        act(() => {
            mockRoom.emit('connected', 'connected');
        });
        expect(mockOnConnect).toHaveBeenCalled();
    });

    it('should tear down old listeners when receiving a new room', () => {
        const originalMockRoom = mockRoom;
        const { rerender } = renderHook(() => useHandleOnConnect(mockRoom, () => { }));
        expect(originalMockRoom.listenerCount('connected')).toBe(1);

        act(() => {
            mockRoom = new EventEmitter.EventEmitter() as Room;
        });

        rerender();

        expect(originalMockRoom.listenerCount('connected')).toBe(0);
        expect(mockRoom.listenerCount('connected')).toBe(1);
    });

    it('should clean up listeners on unmount', () => {
        const { unmount } = renderHook(() => useHandleOnConnect(mockRoom, () => { }));
        unmount();
        expect(mockRoom.listenerCount('connected')).toBe(0);
    });
});
