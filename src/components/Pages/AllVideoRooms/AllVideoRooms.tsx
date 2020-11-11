import { ContentFeed, Sponsor, UserProfile, VideoRoom } from "@clowdr-app/clowdr-db-schema";
import {
    DataDeletedEventDetails,
    DataUpdatedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useConference from "../../../hooks/useConference";
import useDataSubscription from "../../../hooks/useDataSubscription";
import useHeading from "../../../hooks/useHeading";
import useSafeAsync from "../../../hooks/useSafeAsync";
import Column, { Item as ColumnItem } from "../../Columns/Column/Column";
import Columns from "../../Columns/Columns";
import "./AllVideoRooms.scss";

type RoomData = {
    room: VideoRoom;
    participants: Array<UserProfile>;
    contentFeeds: Array<ContentFeed>;
    sponsors: Array<Sponsor>;
};

export default function AllVideoRooms() {
    useHeading("All Rooms");

    const conference = useConference();
    const [videoRooms, setVideoRooms] = useState<Array<VideoRoom> | null>(null);
    const [rooms, setRooms] = useState<Array<RoomData> | null>(null);
    const [roomItems, setRoomItems] = useState<Array<ColumnItem<RoomData>> | undefined>();
    const [programRoomItems, setProgramRoomItems] = useState<Array<ColumnItem<RoomData>> | undefined>();

    // Subscribe to VideoRooms
    useSafeAsync(
        async () => {
            const vr = await VideoRoom.getAll(conference.id);
            return vr;
        },
        setVideoRooms,
        [conference.id],
        "AllVideoRooms:ChatView:setVideoRooms"
    );

    const onVideoRoomUpdated = useCallback(function _onVideoRoomUpdated(ev: DataUpdatedEventDetails<"VideoRoom">) {
        setVideoRooms(existing => {
            const updated = Array.from(existing ?? []);
            for (const object of ev.objects) {
                const idx = updated?.findIndex(x => x.id === object.id);
                const item = object as VideoRoom;
                if (idx === -1) {
                    updated.push(item);
                } else {
                    updated.splice(idx, 1, item);
                }
            }
            return updated;
        });
    }, []);

    const onVideoRoomDeleted = useCallback(function _onVideoRoomDeleted(ev: DataDeletedEventDetails<"VideoRoom">) {
        setVideoRooms(existing => (existing ?? []).filter(item => item.id !== ev.objectId));
    }, []);

    useDataSubscription("VideoRoom", onVideoRoomUpdated, onVideoRoomDeleted, !videoRooms, conference);

    useSafeAsync(
        async () => {
            return videoRooms
                ? await Promise.all(
                      videoRooms.map(async room => {
                          const participants = await room.participantProfiles;
                          const relatedContentFeeds = await ContentFeed.getAllByVideoRoom(room.id, conference.id);
                          const relatedSponsors = await Sponsor.getAllByVideoRoom(room.id, conference.id);
                          return { room, participants, contentFeeds: relatedContentFeeds, sponsors: relatedSponsors };
                      })
                  )
                : null;
        },
        setRooms,
        [videoRooms, videoRooms?.length, conference.id],
        "AllVideoRooms:ChatView:setRooms"
    );

    useEffect(() => {
        const items = rooms
            ?.filter(room => room.contentFeeds.length === 0)
            ?.filter(room => room.sponsors.length === 0)
            ?.sort(sortRooms)
            ?.map(room => {
                return {
                    key: room.room.id,
                    renderData: room,
                    text: room.room.name,
                    link: `/room/${room.room.id}`,
                };
            });
        setRoomItems(items);
    }, [rooms]);

    useEffect(() => {
        const items = rooms
            ?.filter(room => room.contentFeeds.length > 0)
            ?.filter(room => room.sponsors.length === 0)
            ?.sort(sortRooms)
            ?.map(room => {
                return {
                    key: room.room.id,
                    renderData: room,
                    text: room.room.name,
                    link: `/room/${room.room.id}`,
                };
            });
        setProgramRoomItems(items);
    }, [rooms]);

    function sortRooms(x: RoomData, y: RoomData): number {
        if (x.participants.length > 0) {
            if (y.participants.length > 0) {
                return x.room.name.localeCompare(y.room.name);
            } else {
                return -1;
            }
        } else {
            if (y.participants.length > 0) {
                return 1;
            } else {
                return x.room.name.localeCompare(y.room.name);
            }
        }
    }

    function roomRenderer(item: ColumnItem<RoomData>): JSX.Element {
        const data = item.renderData;
        return (
            <>
                <Link to={`/room/${data.room.id}`} className="room-item" title={data.room.name}>
                    <i className="fas fa-video room-item__icon"></i>
                    <div className="room-item__name">{data.room.name}</div>
                    {data.participants.length > 0 ? (
                        <ul className="room-item__participants">
                            {data.participants.map(participant => (
                                <li key={participant.id}>{participant.displayName}</li>
                            ))}
                        </ul>
                    ) : (
                        <></>
                    )}
                </Link>
            </>
        );
    }

    return (
        <Columns className="all-rooms">
            <Column
                className="col"
                itemRenderer={{ render: roomRenderer }}
                items={roomItems}
                loadingMessage="Loading rooms"
                emptyMessage="No breakout rooms."
                sort={(a, b) => sortRooms(a.renderData, b.renderData)}
                windowWithItemHeight={50}
            >
                <h2>Breakout rooms</h2>
            </Column>
            <Column
                className="col"
                itemRenderer={{ render: roomRenderer }}
                items={programRoomItems}
                loadingMessage="Loading rooms"
                emptyMessage="No program rooms."
                sort={(a, b) => sortRooms(a.renderData, b.renderData)}
                windowWithItemHeight={50}
            >
                <h2>Program rooms</h2>
            </Column>
        </Columns>
    );
}
