import React, { useCallback, useEffect, useReducer } from 'react';
import useConference from '../../../hooks/useConference';
import useMaybeUserProfile from '../../../hooks/useMaybeUserProfile';
import MenuExpander, { ButtonSpec } from "../Menu/MenuExpander";
import MenuGroup, { MenuGroupItems } from '../Menu/MenuGroup';
import MenuItem from '../Menu/MenuItem';
import { UserProfile, VideoRoom, WatchedItems } from '@clowdr-app/clowdr-db-schema';
import { makeCancelable } from '@clowdr-app/clowdr-db-schema/build/Util';
import { DataDeletedEventDetails, DataUpdatedEventDetails } from '@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache';
import useDataSubscription from '../../../hooks/useDataSubscription';
import { LoadingSpinner } from '../../LoadingSpinner/LoadingSpinner';
import useSafeAsync from '../../../hooks/useSafeAsync';
import { addNotification } from '../../../classes/Notifications/Notifications';
import { useLocation } from 'react-router-dom';

interface Props {
    minSearchLength: number;
    onItemClicked?: () => void;
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
    currentUserId: string | null;
    isOpen: boolean;
    roomSearch: string | null;
    allRooms: Array<FullRoomInfo> | null
    filteredRooms: Array<FullRoomInfo>;
    watchedRoomIds: Array<string> | null;
    currentLocation: string;
}

type RoomsGroupUpdate
    = { action: "updateAllRooms"; rooms: Array<FullRoomInfo> }
    | { action: "updateFilteredRooms"; rooms: Array<FullRoomInfo> }
    | { action: "deleteRooms"; rooms: Array<string> }
    | { action: "searchRooms"; search: string | null }
    | { action: "setIsOpen"; isOpen: boolean }
    | { action: "setWatchedRoomIds"; ids: Array<string> }
    | { action: "setCurrentUserId", id: string | null }
    | { action: "setCurrentLocation", location: string }
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
        currentUserId: currentState.currentUserId,
        isOpen: currentState.isOpen,
        roomSearch: currentState.roomSearch,
        allRooms: currentState.allRooms,
        filteredRooms: currentState.filteredRooms,
        watchedRoomIds: currentState.watchedRoomIds,
        currentLocation: currentState.currentLocation
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
            case "deleteRooms":
                nextState.allRooms = nextState.allRooms?.filter(x => !update.rooms.includes(x.room.id)) ?? null;
                nextState.filteredRooms = nextState.filteredRooms?.filter(x => !update.rooms.includes(x.room.id)) ?? null;
                break;
            case "setWatchedRoomIds":
                nextState.watchedRoomIds = update.ids;
                break;
            case "setCurrentUserId":
                nextState.currentUserId = update.id;
                break;
            case "setCurrentLocation":
                nextState.currentLocation = update.location;
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

            for (const room of nextState.allRooms) {
                if (!nextState.currentLocation.includes(`/room/${room.room.id}`) &&
                    nextState.watchedRoomIds?.includes(room.room.id)
                ) {
                    const oldRoom = currentState.allRooms?.find(x => x.room.id === room.room.id);
                    if (oldRoom) {
                        room.participants.forEach(p => {
                            if (p.id !== nextState.currentUserId) {
                                if (!oldRoom.participants.find(x => x.id === p.id)) {
                                    addNotification(`${p.displayName} joined ${room.room.name}`, {
                                        url: `/room/${room.room.id}`,
                                        text: "Go to room"
                                    }, 3000);
                                }
                            }
                        });
                    }
                }
            }
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
    const location = useLocation();
    const [state, dispatchUpdate] = useReducer(nextSidebarState, {
        tasks: new Set([
            "loadingAllRooms"
        ] as RoomsGroupTasks[]),
        currentUserId: mUser?.id ?? null,
        isOpen: true,
        roomSearch: null,
        allRooms: null,
        filteredRooms: [],
        watchedRoomIds: null,
        currentLocation: location.pathname
    });

    useEffect(() => {
        dispatchUpdate({
            action: "setCurrentUserId",
            id: mUser?.id ?? null
        });
    }, [mUser]);

    useEffect(() => {
        dispatchUpdate({
            action: "setCurrentLocation",
            location: location.pathname
        });
    }, [location.pathname]);

    useSafeAsync(async () => mUser?.watched ?? null, (data: WatchedItems | null) => {
        if (data) {
            dispatchUpdate({
                action: "setWatchedRoomIds",
                ids: data.watchedRooms
            });
        }
    }, [mUser?.watchedId]);

    const watchedId = mUser?.watchedId;
    const onWatchedItemsUpdated = useCallback(function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
        if (update.object.id === watchedId) {
            dispatchUpdate({
                action: "setWatchedRoomIds",
                ids: (update.object as WatchedItems).watchedRooms
            });
        }
    }, [watchedId]);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, !state.watchedRoomIds, conf);


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
        { type: "link", label: "Show all rooms", icon: "fas fa-mug-hot", url: "/room" },
        { type: "link", label: "Create new room", icon: "fas fa-plus", url: "/room/new" }
    ];

    if (mUser) {
        let roomsEl: JSX.Element = <></>;
        let noRooms = true;
        if (state.filteredRooms.length > 0) {
            const roomSearchValid = state.roomSearch && state.roomSearch.length >= props.minSearchLength;
            let activeRooms = state.filteredRooms.filter(x => x.participants.length > 0);
            let inactiveRooms = state.filteredRooms.filter(x => x.participants.length === 0 && (roomSearchValid || !x.isFeedRoom || state.watchedRoomIds?.includes(x.room.id)));
            activeRooms = activeRooms.sort((x, y) => x.room.name.localeCompare(y.room.name));
            inactiveRooms = inactiveRooms.sort((x, y) => x.room.name.localeCompare(y.room.name));

            noRooms = activeRooms.length === 0 && inactiveRooms.length === 0;

            if (!noRooms) {
                let roomMenuItems: MenuGroupItems = [];
                roomMenuItems = roomMenuItems.concat(activeRooms.map(room => {
                    const participants = room.participants;
                    const morePeopleCount = participants.length - maxRoomParticipantsToList;
                    return {
                        key: room.room.id,
                        element: <MenuItem
                            title={room.room.name}
                            label={room.room.name}
                            icon={< i className="fas fa-video" ></i >}
                            action={`/room/${room.room.id}`}
                            onClick={props.onItemClicked}>
                            <>
                                <ul>
                                    {participants
                                        .slice(0, Math.min(participants.length, maxRoomParticipantsToList))
                                        .map(x => <li key={x.id}><div>{x.displayName}</div></li>)}
                                </ul>
                                {morePeopleCount > 0
                                    ? <div
                                        key="more-participants"
                                        className="plus-bullet">
                                        {morePeopleCount} more {morePeopleCount === 1 ? "person" : "people"}...
                                    </div>
                                    : <></>}
                            </>
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
                            action={`/room/${room.room.id}`}
                            onClick={props.onItemClicked} />
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
                    element: <MenuItem title="View all rooms" label="All rooms" icon={<i className="fas fa-person-booth"></i>} action="/room" bold={true} onClick={props.onItemClicked} />
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
