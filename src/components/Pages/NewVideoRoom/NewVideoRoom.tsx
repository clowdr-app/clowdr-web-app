import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import Toggle from "react-toggle";
import useHeading from "../../../hooks/useHeading";
import useMaybeVideo from "../../../hooks/useMaybeVideo";
import AsyncButton from "../../AsyncButton/AsyncButton";
import { addError } from "../../../classes/Notifications/Notifications";
import "./NewVideoRoom.scss";
import useUserRoles from "../../../hooks/useUserRoles";

export default function NewVideoRoom() {
    const mVideo = useMaybeVideo();
    const [newRoomId, setNewRoomId] = useState<string | null>(null);

    const [title, setTitle] = useState<string>("");
    const [capacity, setCapacity] = useState<number>(10);
    const [isPersistent, setIsPersistent] = useState<boolean>(false);
    const [isPrivate, setIsPrivate] = useState<boolean>(false);
    const { isAdmin, isManager } = useUserRoles();

    useHeading("New room");

    /**
     * Elements that need to be on this page (as a MVP):
     *
     *    * Room title
     *    * Public vs private selector
     *    * Ephemeral selector (forced to true if not an admin/manager)
     */

    async function doCreateRoom(ev: React.FormEvent) {
        ev.preventDefault();
        ev.stopPropagation();

        if (title === null || title.trim().length < 5) {
            addError("You must choose a room title with at least five characters.");
            return;
        }

        const _newRoomId = await mVideo?.createVideoRoom(
            capacity, !isPersistent, isPrivate, title
        );
        console.log(`New room id: ${_newRoomId}`);
        setNewRoomId(_newRoomId ?? null);
    }

    const capacityEl = <>
        <label htmlFor="capacity">Capacity</label>
        <input type="number" min="2" max="50" defaultValue={capacity} onChange={(ev) => setCapacity(ev.target.valueAsNumber)} />
    </>;
    const privateEl = <>
        <label htmlFor="is-private">Private?</label>
        <Toggle
            name="is-private"
            defaultChecked={false}
            onChange={(ev) => setIsPrivate(ev.target.checked)}
        />
        <span>Admins can access all private breakout rooms.</span>
    </>;
    const persistentEl = <>
        <label htmlFor="is-persistent">Persistent?</label>
        <Toggle
            name="is-persistent"
            defaultChecked={false}
            onChange={(ev) => setIsPersistent(ev.target.checked)}
        />
    </>;
    const titleEl = <>
        <label htmlFor="title-control">Name</label>
        <input
            name="title-control"
            type="text"
            placeholder="Title of the room"
            maxLength={25}
            onChange={(ev) => setTitle(ev.target.value)}
        />
    </>;
    const createButton =
        <AsyncButton action={(ev) => doCreateRoom(ev)} content="Create room" />;

    return newRoomId
        ? <Redirect to={`/room/${newRoomId}`} />
        : <div className="new-video-room">
            <form onSubmit={(ev) => doCreateRoom(ev)}>
                {capacityEl}<br />
                {titleEl}<br />
                {privateEl}<br />
                {isAdmin || isManager ? <>{persistentEl}<br/></> : <></>}
                <div className="submit-container">
                    {createButton}
                </div>
            </form>
        </div>;
}
