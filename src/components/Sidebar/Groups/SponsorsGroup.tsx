import React, { useCallback, useEffect, useReducer } from "react";
import useConference from "../../../hooks/useConference";
import useMaybeUserProfile from "../../../hooks/useMaybeUserProfile";
import MenuExpander, { ButtonSpec } from "../Menu/MenuExpander";
import MenuGroup, { MenuGroupItems } from "../Menu/MenuGroup";
import MenuItem from "../Menu/MenuItem";
import { Sponsor, UserProfile, VideoRoom, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import { makeCancelable } from "@clowdr-app/clowdr-db-schema/build/Util";
import {
    DataDeletedEventDetails,
    DataUpdatedEventDetails,
} from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import useDataSubscription from "../../../hooks/useDataSubscription";
import { LoadingSpinner } from "../../LoadingSpinner/LoadingSpinner";
import useSafeAsync from "../../../hooks/useSafeAsync";
import { addNotification } from "../../../classes/Notifications/Notifications";
import { useLocation } from "react-router-dom";

interface Props {
    minSearchLength: number;
    onItemClicked?: () => void;
}

type SponsorsGroupTasks = "loadingAllSponsors";

type FullSponsorInfo = {
    sponsor: Sponsor;
    participants: Array<UserProfile>;
};

interface SponsorsGroupState {
    tasks: Set<SponsorsGroupTasks>;
    currentUserId: string | null;
    isOpen: boolean;
    sponsorSearch: string | null;
    allSponsors: Array<FullSponsorInfo> | null;
    filteredSponsors: Array<FullSponsorInfo>;
    watchedSponsorIds: Array<string> | null;
    currentLocation: string;
}

type ParticipantUpdate = { sponsorId: string; participants: Array<UserProfile> };

type SponsorsGroupUpdate =
    | { action: "updateAllSponsors"; sponsors: Array<FullSponsorInfo> }
    | { action: "updateFilteredSponsors"; sponsors: Array<FullSponsorInfo> }
    | { action: "updateRoomParticipants"; participantsUpdates: Array<ParticipantUpdate> }
    | { action: "deleteSponsors"; sponsors: Array<string> }
    | { action: "searchSponsors"; search: string | null }
    | { action: "setIsOpen"; isOpen: boolean }
    | { action: "setWatchedSponsorIds"; ids: Array<string> }
    | { action: "setCurrentUserId"; id: string | null }
    | { action: "setCurrentLocation"; location: string };

const maxSponsorRoomParticipantsToList = 6;

async function filterSponsors(
    allSponsors: Array<FullSponsorInfo>,
    _search: string | null,
    minSearchLength: number
): Promise<Array<FullSponsorInfo>> {
    if (_search && _search.length >= minSearchLength) {
        const search = _search.toLowerCase();
        return allSponsors.filter(
            x =>
                x.sponsor.name.toLowerCase().includes(search) ||
                x.participants.some(y => y.displayName.includes(search))
        );
    } else {
        return allSponsors;
    }
}

function nextSidebarState(
    currentState: SponsorsGroupState,
    updates: SponsorsGroupUpdate | Array<SponsorsGroupUpdate>
): SponsorsGroupState {
    const nextState: SponsorsGroupState = {
        tasks: new Set(currentState.tasks),
        currentUserId: currentState.currentUserId,
        isOpen: currentState.isOpen,
        sponsorSearch: currentState.sponsorSearch,
        allSponsors: currentState.allSponsors,
        filteredSponsors: currentState.filteredSponsors,
        watchedSponsorIds: currentState.watchedSponsorIds,
        currentLocation: currentState.currentLocation,
    };

    let allSponsorsUpdated = false;

    function doUpdate(update: SponsorsGroupUpdate) {
        switch (update.action) {
            case "searchSponsors":
                nextState.sponsorSearch = update.search?.length ? update.search : null;
                break;
            case "setIsOpen":
                nextState.isOpen = update.isOpen;
                break;
            case "updateAllSponsors":
                {
                    const changes = [...update.sponsors];
                    const updatedIds = changes.map(x => x.sponsor.id);
                    nextState.allSponsors =
                        nextState.allSponsors?.map(x => {
                            const idx = updatedIds.indexOf(x.sponsor.id);
                            if (idx > -1) {
                                const y = changes[idx];
                                updatedIds.splice(idx, 1);
                                changes.splice(idx, 1);
                                return y;
                            } else {
                                return x;
                            }
                        }) ?? null;
                    nextState.allSponsors = nextState.allSponsors?.concat(changes) ?? changes;
                    nextState.allSponsors = nextState.allSponsors.sort((a, b) =>
                        a.sponsor.name.localeCompare(b.sponsor.name)
                    );
                    allSponsorsUpdated = true;
                }
                break;
            case "updateFilteredSponsors":
                nextState.filteredSponsors = update.sponsors;
                break;
            case "updateRoomParticipants":
                for (const participantUpdate of update.participantsUpdates) {
                    for (const sponsor of nextState.allSponsors?.filter(
                        x => x.sponsor.id === participantUpdate.sponsorId
                    ) ?? []) {
                        sponsor.participants = participantUpdate.participants;
                    }
                }
                allSponsorsUpdated = true;
                break;
            case "deleteSponsors":
                nextState.allSponsors =
                    nextState.allSponsors?.filter(x => !update.sponsors.includes(x.sponsor.id)) ?? null;
                nextState.filteredSponsors =
                    nextState.filteredSponsors?.filter(x => !update.sponsors.includes(x.sponsor.id)) ?? null;
                break;
            case "setWatchedSponsorIds":
                nextState.watchedSponsorIds = update.ids;
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
    } else {
        doUpdate(updates);
    }

    if (allSponsorsUpdated) {
        if (nextState.allSponsors) {
            nextState.tasks.delete("loadingAllSponsors");

            for (const sponsorInfo of nextState.allSponsors) {
                if (
                    !nextState.currentLocation.includes(`/sponsor/${sponsorInfo.sponsor.id}`) &&
                    nextState.watchedSponsorIds?.includes(sponsorInfo.sponsor.id)
                ) {
                    const oldSponsor = currentState.allSponsors?.find(x => x.sponsor.id === sponsorInfo.sponsor.id);
                    if (oldSponsor) {
                        sponsorInfo.participants.forEach(p => {
                            if (p.id !== nextState.currentUserId) {
                                if (!oldSponsor.participants.find(x => x.id === p.id)) {
                                    addNotification(
                                        `${p.displayName} joined ${sponsorInfo.sponsor.name}`,
                                        {
                                            url: `/sponsor/${sponsorInfo.sponsor.id}`,
                                            text: "Go to sponsor",
                                        },
                                        3000
                                    );
                                }
                            }
                        });
                    }
                }
            }
        } else {
            nextState.filteredSponsors = [];
        }
    }

    return nextState;
}

export default function SponsorsGroup(props: Props) {
    const conf = useConference();
    const mUser = useMaybeUserProfile();
    const location = useLocation();
    const [state, dispatchUpdate] = useReducer(nextSidebarState, {
        tasks: new Set(["loadingAllSponsors"] as SponsorsGroupTasks[]),
        currentUserId: mUser?.id ?? null,
        isOpen: true,
        sponsorSearch: null,
        allSponsors: null,
        filteredSponsors: [],
        watchedSponsorIds: null,
        currentLocation: location.pathname,
    });

    useEffect(() => {
        dispatchUpdate({
            action: "setCurrentUserId",
            id: mUser?.id ?? null,
        });
    }, [mUser]);

    useEffect(() => {
        dispatchUpdate({
            action: "setCurrentLocation",
            location: location.pathname,
        });
    }, [location.pathname]);

    // useSafeAsync(
    //     async () => mUser?.watched ?? null,
    //     (data: WatchedItems | null) => {
    //         if (data) {
    //             dispatchUpdate({
    //                 action: "setWatchedSponsorRoomIds",
    //                 ids: data.watchedRooms,
    //             });
    //         }
    //     },
    //     [mUser?.watchedId]
    // );

    // const watchedId = mUser?.watchedId;
    // const onWatchedItemsUpdated = useCallback(
    //     function _onWatchedItemsUpdated(update: DataUpdatedEventDetails<"WatchedItems">) {
    //         for (const object of update.objects) {
    //             if (object.id === watchedId) {
    //                 dispatchUpdate({
    //                     action: "setWatchedRoomIds",
    //                     ids: (object as WatchedItems).watchedRooms,
    //                 });
    //             }
    //         }
    //     },
    //     [watchedId]
    // );

    // useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, !state.watchedRoomIds, conf);

    // Initial fetch of sponsors
    useEffect(() => {
        let cancel: () => void = () => {};

        async function updateSponsors() {
            try {
                const promise: Promise<Array<FullSponsorInfo>> = Sponsor.getAll(conf.id).then(sponsors => {
                    return Promise.all(
                        sponsors.map(async sponsor => {
                            const room = await sponsor.videoRoom;
                            const participants = await room?.participantProfiles;
                            return {
                                sponsor,
                                participants: participants ?? [],
                            };
                        })
                    );
                });
                const wrappedPromise = makeCancelable(promise);
                cancel = wrappedPromise.cancel;

                const allSponsors = await wrappedPromise.promise;

                dispatchUpdate([
                    {
                        action: "updateAllSponsors",
                        sponsors: allSponsors,
                    },
                ]);
            } catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        updateSponsors();

        return cancel;
    }, [conf.id]);

    // Update filtered sponsor results
    useEffect(() => {
        let cancel: () => void = () => {};

        async function updateFiltered() {
            try {
                const promise = makeCancelable(
                    filterSponsors(state.allSponsors ?? [], state.sponsorSearch, props.minSearchLength)
                );
                cancel = promise.cancel;
                const filteredSponsors = await promise.promise;

                dispatchUpdate({
                    action: "updateFilteredSponsors",
                    sponsors: filteredSponsors,
                });
            } catch (e) {
                if (!e.isCanceled) {
                    throw e;
                }
            }
        }

        updateFiltered();

        return cancel;
    }, [conf, conf.id, props.minSearchLength, state.allSponsors, state.sponsorSearch]);

    // Subscribe to sponsor updates
    const onSponsorUpdated = useCallback(async function _onSponsorUpdated(ev: DataUpdatedEventDetails<"Sponsor">) {
        const newSponsors: FullSponsorInfo[] = await Promise.all(
            ev.objects.map(async object => {
                const sponsor = object as Sponsor;
                const room = await sponsor.videoRoom;
                const participants = await room?.participantProfiles;
                return {
                    sponsor,
                    participants: participants ?? [],
                };
            })
        );
        if (newSponsors.length > 0) {
            dispatchUpdate({
                action: "updateAllSponsors",
                sponsors: newSponsors,
            });
        }
    }, []);

    const onSponsorDeleted = useCallback(function _onSponsorDeleted(ev: DataDeletedEventDetails<"Sponsor">) {
        dispatchUpdate({ action: "deleteSponsors", sponsors: [ev.objectId] });
    }, []);

    useDataSubscription("Sponsor", onSponsorUpdated, onSponsorDeleted, state.tasks.has("loadingAllSponsors"), conf);

    // Subscribe to room updates
    const onRoomUpdated = useCallback(
        async function _onRoomUpdated(ev: DataUpdatedEventDetails<"VideoRoom">) {
            const participantsUpdates = (
                await Promise.all(
                    ev.objects.map(async object => {
                        const room = object as VideoRoom;
                        const participants = await room.participantProfiles;
                        return (
                            state.allSponsors
                                ?.filter(x => x.sponsor.videoRoomId === room.id)
                                .map(x => ({ sponsorId: x.sponsor.id, participants })) ?? []
                        );
                    })
                )
            ).flat(1);

            console.log("video room updated", participantsUpdates);
            dispatchUpdate({ action: "updateRoomParticipants", participantsUpdates: participantsUpdates });
        },
        [state.allSponsors]
    );

    const onRoomDeleted = useCallback(
        async function _onRoomDeleted(ev: DataDeletedEventDetails<"VideoRoom">) {
            const participantsUpdates = await Promise.all(
                state.allSponsors
                    ?.filter(x => x.sponsor.videoRoomId === ev.objectId)
                    .map(x => ({ sponsorId: x.sponsor.id, participants: [] })) ?? []
            );
            dispatchUpdate({ action: "updateRoomParticipants", participantsUpdates: participantsUpdates });
        },
        [state.allSponsors]
    );

    useDataSubscription("VideoRoom", onRoomUpdated, onRoomDeleted, state.tasks.has("loadingAllSponsors"), conf);

    const sponsorsButtons: Array<ButtonSpec> = [
        {
            type: "search",
            label: "Search all sponsors",
            icon: "fas fa-search",
            onSearch: event => {
                dispatchUpdate({ action: "searchSponsors", search: event.target.value });
                return event.target.value;
            },
            onSearchOpen: () => {
                dispatchUpdate({ action: "setIsOpen", isOpen: true });
            },
            onSearchClose: () => {
                dispatchUpdate({ action: "searchSponsors", search: null });
            },
        },
        { type: "link", label: "Show all sponsors", icon: "fas fa-user-tie", url: "/sponsor" },
    ];

    function getSponsorMenuItems() {
        return state.filteredSponsors.map(sponsor => {
            const participants = sponsor.participants;
            const morePeopleCount = participants.length - maxSponsorRoomParticipantsToList;
            return {
                key: sponsor.sponsor.id,
                element: (
                    <MenuItem
                        title={sponsor.sponsor.name}
                        label={sponsor.sponsor.name}
                        icon={<i className="fas fa-circle"></i>}
                        action={`/sponsor/${sponsor.sponsor.id}`}
                        onClick={props.onItemClicked}
                    >
                        <ul>
                            {participants
                                .slice(0, Math.min(participants.length, maxSponsorRoomParticipantsToList))
                                .map(x => (
                                    <li key={x.id}>
                                        <div>{x.displayName}</div>
                                    </li>
                                ))}
                        </ul>
                        {morePeopleCount > 0 ? (
                            <div key="more-participants" className="plus-bullet">
                                {morePeopleCount} more {morePeopleCount === 1 ? "person" : "people"}...
                            </div>
                        ) : (
                            <></>
                        )}
                    </MenuItem>
                ),
            };
        });
    }

    const sponsorsEl = <MenuGroup items={getSponsorMenuItems()} />;

    const sponsorsExpander = mUser && (
        <MenuExpander
            title="Sponsors"
            isOpen={state.isOpen}
            buttons={sponsorsButtons}
            onOpenStateChange={() => dispatchUpdate({ action: "setIsOpen", isOpen: !state.isOpen })}
        >
            {sponsorsEl}
        </MenuExpander>
    );

    return sponsorsExpander;
}
