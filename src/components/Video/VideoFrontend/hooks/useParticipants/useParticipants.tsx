import { useEffect, useState } from 'react';
import { Participant, RemoteParticipant } from 'twilio-video';
import useVideoContext from '../useVideoContext/useVideoContext';

export type ParticipantWithSlot = {
    participant: Participant,
    slot: number
};

export default function useParticipants() {
    const { room } = useVideoContext();
    const [participants, setParticipants] = useState<Array<ParticipantWithSlot>>(Array.from(room.participants.values()).map((x, idx) => ({
        participant: x,
        // Slot 0 is reserved for local participant
        slot: idx + 1
    })));

    useEffect(() => {
        const participantConnected
            = (participant: RemoteParticipant) =>
                setParticipants(prevParticipants => {
                    let idx = 0;
                    const ps = prevParticipants.sort((x, y) => x.slot < y.slot ? -1 : x.slot === y.slot ? 0 : 1);
                    while (idx < ps.length) {
                        if (idx === ps[idx].slot) {
                            idx++;
                        }
                        else {
                            break;
                        }
                    }
                    return [
                        ...prevParticipants,
                        {
                            participant,
                            // Slot 0 is reserved for local participant
                            slot: idx + 1
                        }
                    ];
                });

        const participantDisconnected = (participant: RemoteParticipant) =>
            setParticipants(prevParticipants => prevParticipants.filter(p => p.participant !== participant));
        room.on('participantConnected', participantConnected);
        room.on('participantDisconnected', participantDisconnected);
        return () => {
            room.off('participantConnected', participantConnected);
            room.off('participantDisconnected', participantDisconnected);
        };
    }, [room]);

    return participants;
}
