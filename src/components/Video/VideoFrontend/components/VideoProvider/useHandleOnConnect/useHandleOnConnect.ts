import { useEffect } from 'react';
import { Room } from 'twilio-video';
import { Callback } from '../../../types';

export default function useHandleOnConnect(room: Room, onConnect: Callback) {
    useEffect(() => {
        room.on('connected', onConnect);
        return () => {
            room.off('connected', onConnect);
        };
    }, [room, onConnect]);
}
