import React, { useCallback, useEffect, useReducer } from 'react';
import useConference from '../../../hooks/useConference';
import useMaybeUserProfile from '../../../hooks/useMaybeUserProfile';
import MenuExpander, { ButtonSpec } from "../Menu/MenuExpander";
import MenuGroup, { MenuGroupItems } from '../Menu/MenuGroup';
import MenuItem from '../Menu/MenuItem';
import { UserProfile, VideoRoom } from '@clowdr-app/clowdr-db-schema';
import { makeCancelable } from '@clowdr-app/clowdr-db-schema/build/Util';
import { DataDeletedEventDetails, DataUpdatedEventDetails } from '@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache';
import useDataSubscription from '../../../hooks/useDataSubscription';
import { LoadingSpinner } from '../../LoadingSpinner/LoadingSpinner';

interface Props {
    minSearchLength: number;
}

type RoomsGroupTasks
    = "loadingAllRooms";

type FullRoomInfo = {
    room: VideoRoom,
    participants: Array<UserProfile>,
    isFeedRoom: boolean
};

interface RoomsGroupState {
    tasks: Set<RoomsGroupTasks>;
    isOpen: boolean;
    roomSearch: string | null;
    allRooms: Array<FullRoomInfo> | null
    filteredRooms: Array<FullRoomInfo>;
}

type RoomsGroupUpdate
    = { action: "updateAllRooms"; rooms: Array<FullRoomInfo> }
    | { action: "updateFilteredRooms"; rooms: Array<FullRoomInfo> }
    | { action: "deleteRooms"; rooms: Array<string> }
    | { action: "searchRooms"; search: string | null }
    | { action: "setIsOpen"; isOpen: boolean }
    ;

const maxRoomParticipantsToList = 6;

async function filterRooms(
    allRooms: Array<FullRoomInfo>,
    _search: string | null,
    minSearchLength: number): Promise<Array<FullRoomInfo>> {
    if (_search && _search.length >= minSearchLength) {
        const search = _search.toLowerCase();
        return allRooms.filter(x =>
            x.room.name.toLowerCase().includes(search) ||
            x.participants.some(y => y.displayName.includes(search))
        );
    }
    else {
        return allRooms;
    }
}

function nextSidebarState(currentState: RoomsGroupState, updates: RoomsGroupUpdate | Array<RoomsGroupUpdate>): RoomsGroupState {
    const nextState: RoomsGroupState = {
        tasks: new Set(currentState.tasks),
        isOpen: currentState.isOpen,
        roomSearch: currentState.roomSearch,
        allRooms: currentState.allRooms,
        filteredRooms: currentState.filteredRooms
    };

    let allRoomsUpdated = false;

    function doUpdate(update: RoomsGroupUpdate) {
        switch (update.action) {
            case "searchRooms":
                nextState.roomSearch = update.search?.length ? update.search : null;
                break;
            case "setIsOpen":
                nextState.isOpen = update.isOpen;
                break;
            case "updateAllRooms":
                {
                    const changes = [...update.rooms];
                    const updatedIds = changes.map(x => x.room.id);
                    nextState.allRooms = nextState.allRooms?.map(x => {
                        const idx = updatedIds.indexOf(x.room.id);
                        if (idx > -1) {
                            const y = changes[idx];
                            updatedIds.splice(idx, 1);
                            changes.splice(idx, 1);
                            return y;
                        }
                        else {
                            return x;
                        }
                    }) ?? null;
                    nextState.allRooms = nextState.allRooms?.concat(changes) ?? changes;
                    allRoomsUpdated = true;
                }
                break;
            case "updateFilteredRooms":
                nextState.filteredRooms = update.rooms;
                break;
        }
    }

    if (updates instanceof Array) {
        updates.forEach(doUpdate);
    }
    else {
        doUpdate(updates);
    }

    if (allRoomsUpdated) {
        if (nextState.allRooms) {
            nextState.tasks.delete("loadingAllRooms");
        }
        else {
            nextState.filteredRooms = [];
        }
    }

    return nextState;
}

export default function RoomsGroup(props: Props) {
    const conf = useConference();
    const mUser = useMaybeUserProfile();
    const [state, dispatchUpdate] = useReducer(nextSidebarState, {
        tasks: new Set([
            "loadingAllRooms"
        ] as RoomsGroupTasks[]),
        isOpen: true,
        roomSearch: null,
        allRooms: null,
        filteredRooms: [],
    });

    // Initial fetch of rooms
    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateRooms() {
            try {
                const promise: Promise<Array<FullRoomInfo>>
                    = VideoRoom.getAll(conf.id).then(rooms => {
                        return Promise.all(rooms.map(async room => {
                            const [participants, feeds] = await Promise.all([room.participantProfiles, room.feeds]);
                            const isFeedRoom = feeds.length > 0;
                            return {
                                room,
                                participants,
                                isFeedRoom
                            };
                        }));
                    });
                const wrappedPromise = makeCancelable(promise);
                cancel = wrappedPromise.cancel;

                const allRooms = await wrappedPromise.promise;

                dispatchUpdate([
                    {
                        action: "updateAllRooms",
                        rooms: allRooms
                    }
                ]);
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        updateRooms();

        return cancel;
    }, [conf.id]);

    // Update filtered room results
    useEffect(() => {
        let cancel: () => void = () => { };

        async function updateFiltered() {
            try {
                const promise = makeCancelable(filterRooms(
                    state.allRooms ?? [],
                    state.roomSearch,
                    props.minSearchLength
                ));
                cancel = promise.cancel;
                const filteredRooms = await promise.promise;

                dispatchUpdate({
                    action: "updateFilteredRooms",
                    rooms: filteredRooms
                });
            }
            catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        updateFiltered();

        return cancel;
    }, [conf, conf.id, props.minSearchLength, state.allRooms, state.roomSearch]);

    // Subscribe to room updates

    const onRoomUpdated = useCallback(async function _onRoomUpdated(ev: DataUpdatedEventDetails<"VideoRoom">) {
        const room = ev.object as VideoRoom;
        const [participants, feeds] = await Promise.all([room.participantProfiles, room.feeds]);
        const isFeedRoom = feeds.length > 0;
        dispatchUpdate({
            action: "updateAllRooms",
            rooms: [{
                room,
                participants,
                isFeedRoom
            }]
        });
    }, []);

    const onRoomDeleted = useCallback(function _onRoomDeleted(ev: DataDeletedEventDetails<"VideoRoom">) {
        dispatchUpdate({ action: "deleteRooms", rooms: [ev.objectId] });
    }, []);

    useDataSubscription(
        "VideoRoom",
        onRoomUpdated,
        onRoomDeleted,
        state.tasks.has("loadingAllRooms"),
        conf);

    let roomsExpander: JSX.Element = <></>;

    const roomsButtons: Array<ButtonSpec> = [
        {
            type: "search", label: "Search all rooms", icon: "fas fa-search",
            onSearch: (event) => {
                dispatchUpdate({ action: "searchRooms", search: event.target.value });
                return event.target.value;
            },
            onSearchOpen: () => {
                dispatchUpdate({ action: "setIsOpen", isOpen: true });
            },
            onSearchClose: () => {
                dispatchUpdate({ action: "searchRooms", search: null });
            }
        },
        { type: "link", label: "Show all rooms", icon: "fas fa-person-booth", url: "/room" },
        { type: "link", label: "Create new room", icon: "fas fa-plus", url: "/room/new" }
    ];

    if (mUser) {
        let roomsEl: JSX.Element = <></>;
        let noRooms = true;
        if (state.filteredRooms.length > 0) {
            const roomSearchValid = state.roomSearch && state.roomSearch.length >= props.minSearchLength;
            let activeRooms = state.filteredRooms.filter(x => x.participants.length > 0);
            let inactiveRooms = state.filteredRooms.filter(x => x.participants.length === 0 && (roomSearchValid || !x.isFeedRoom));
            activeRooms = activeRooms.sort((x, y) => x.room.name.localeCompare(y.room.name));
            inactiveRooms = inactiveRooms.sort((x, y) => x.room.name.localeCompare(y.room.name));

            noRooms = activeRooms.length === 0 && inactiveRooms.length === 0;

            if (!noRooms) {
                let roomMenuItems: MenuGroupItems = [];
                roomMenuItems = roomMenuItems.concat(activeRooms.map(room => {
                    const morePeopleCount = room.participants.length - maxRoomParticipantsToList;
                    return {
                        key: room.room.id,
                        element: <MenuItem
                            title={room.room.name}
                            label={room.room.name}
                            icon={< i className="fas fa-video" ></i >}
                            action={`/room/${room.room.id}`} >
                            <ul>
                                {room.participants
                                    .slice(0, Math.min(room.participants.length, maxRoomParticipantsToList))
                                    .map(x => <li key={x.id}>{x.displayName}</li>)}
                                {morePeopleCount > 0
                                    ? <li
                                        key="more-participants"
                                        className="plus-bullet">
                                        {morePeopleCount} more {morePeopleCount === 1 ? "person" : "people"}...
                                    </li>
                                    : <></>}
                            </ul>
                        </MenuItem>
                    };
                }));
                roomMenuItems = roomMenuItems.concat(inactiveRooms.map(room => {
                    return {
                        key: room.room.id,
                        element: <MenuItem
                            title={room.room.name}
                            label={room.room.name}
                            icon={< i className="fas fa-video" ></i >}
                            action={`/room/${room.room.id}`} />
                    };
                }));
                roomsEl = <MenuGroup items={roomMenuItems} />;
            }
        }

        if (noRooms) {
            roomsEl = <>
                {state.allRooms ? <></> : <LoadingSpinner />}
                <MenuGroup items={[{
                    key: "whole-rooms",
                    element: <MenuItem title="View all rooms" label="All rooms" icon={<i className="fas fa-person-booth"></i>} action="/room" bold={true} />
                }]} />
            </>;
        }

        roomsExpander
            = <MenuExpander
                title="Breakout Rooms"
                isOpen={state.isOpen}
                buttons={roomsButtons}
                onOpenStateChange={() => dispatchUpdate({ action: "setIsOpen", isOpen: !state.isOpen })}
            >
                {roomsEl}
            </MenuExpander>;
    }

    return roomsExpander;
}
