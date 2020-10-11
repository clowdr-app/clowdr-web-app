import { ContentFeed, UserProfile, VideoRoom } from "@clowdr-app/clowdr-db-schema";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useConference from "../../../hooks/useConference";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import Column, { Item as ColumnItem } from "../../Columns/Column/Column";
import Columns from "../../Columns/Columns";
import "./AllVideoRooms.scss";

type RoomData = {
    room: VideoRoom,
    participants: Array<UserProfile>,
    contentFeeds: Array<ContentFeed>,
};

export default function ChatView() {
    useHeading("All Rooms");

    const conference = useConference();
    const [rooms, setRooms] = useState<Array<RoomData> | null>(null);
    const [roomItems, setRoomItems] = useState<Array<ColumnItem<RoomData>> | undefined>();
    const [programRoomItems, setProgramRoomItems] = useState<Array<ColumnItem<RoomData>> | undefined>();

    useSafeAsync(async () => {
        const _rooms = await VideoRoom.getAll(conference.id);
        return Promise.all(_rooms.map(async room => {
            const participants = await room.participantProfiles;
            const relatedContentFeeds = await ContentFeed.getAllByVideoRoom(room.id, conference.id);
            return { room, participants, contentFeeds: relatedContentFeeds };
        }));
    }, setRooms, [conference.id]);

    useEffect(() => {
        const items = rooms
            ?.filter(room => room.contentFeeds.length === 0)
            ?.sort(sortRooms)
            ?.map(room => {
                return {
                    key: room.room.id,
                    renderData: room,
                    text: room.room.name,
                    link: `/room/${room.room.id}`,
                } as ColumnItem<RoomData>
            })
        setRoomItems(items);
    }, [rooms]);

    useEffect(() => {
        const items = rooms
            ?.filter(room => room.contentFeeds.length > 0)
            ?.sort(sortRooms)
            ?.map(room => {
                return {
                    key: room.room.id,
                    renderData: room,
                    text: room.room.name,
                    link: `/room/${room.room.id}`,
                } as ColumnItem<RoomData>
            });
        setProgramRoomItems(items);
    }, [rooms]);

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

    function roomRenderer(item: ColumnItem<RoomData>): JSX.Element {
        const data = item.renderData;
        return <>
            <Link to={`/room/${data.room.id}`}>{data.room.name}</Link>
            {data.participants.length > 0
                ? <ul>
                    {data.participants.map(participant =>
                        <li key={participant.id}>
                            {participant.displayName}
                        </li>
                    )}
                </ul>
                : <></>}
        </>;
    }

    return <Columns className="all-rooms">
        <>
            <Column
                className="col"
                itemRenderer={{ render: roomRenderer }}
                items={roomItems}
                loadingMessage="Loading rooms">
                <h2>Rooms</h2>
            </Column>
            <Column
                className="col"
                itemRenderer={{ render: roomRenderer }}
                items={programRoomItems}
                loadingMessage="Loading rooms">
                <h2>Program rooms</h2>
            </Column>
        </>
    </Columns>;
}
