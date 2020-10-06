import { UserProfile, VideoRoom } from "@clowdr-app/clowdr-db-schema";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import "./AllVideoRooms.scss";

type RoomData = {
    room: VideoRoom,
    participants: Array<UserProfile>
};

export default function ChatView() {
    useHeading("All Rooms");

    const conference = useConference();
    const [rooms, setRooms] = useState<Array<RoomData> | null>(null);

    useSafeAsync(async () => {
        const _rooms = await VideoRoom.getAll(conference.id);
        return Promise.all(_rooms.map(async room => {
            const participants = await room.participantProfiles;
            return { room, participants };
        }));
    }, setRooms, [conference.id]);

    let allRoomsEl;
    if (rooms) {
        function sortRooms(x: RoomData, y: RoomData): number {
            if (x.participants.length > 0) {
                if (y.participants.length > 0) {
                    return x.room.name.localeCompare(y.room.name);
                }
                else {
                    return -1;
                }
            }
            else {
                if (y.participants.length > 0) {
                    return 1;
                }
                else {
                    return x.room.name.localeCompare(y.room.name);
                }
            }
        }

        allRoomsEl = <ul>
            {
                rooms.sort(sortRooms).map(x => {
                    return <li key={x.room.id}>
                        <Link to={`/room/${x.room.id}`}>{x.room.name}</Link>
                        {x.participants.length > 0
                            ? <ul>
                                {x.participants.map(participant =>
                                    <li key={participant.id}>
                                        {participant.displayName}
                                    </li>
                                )}
                            </ul>
                            : <></>}
                    </li>;
                })
            }
        </ul>;
    }
    else {
        allRoomsEl = <LoadingSpinner message="Loading rooms" />;
    }

    return <div className="all-rooms">
        <div className="col">
            {allRoomsEl}
        </div>
    </div>;
}
