import { WatchedItems } from "@clowdr-app/clowdr-db-schema";
import { DataUpdatedEventDetails } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Cache/Cache";
import { useCallback, useState } from "react";
import useConference from "./useConference";
import useDataSubscription from "./useDataSubscription";
import useSafeAsync from "./useSafeAsync";
import useUserProfile from "./useUserProfile";

export default function useWatchedItems(): WatchedItems | null {
    const [watchedItems, setWatchedItems] = useState<WatchedItems | null>(null);
    const conference = useConference();
    const profile = useUserProfile();

    useSafeAsync(async () => await profile.watched, setWatchedItems, [profile.watchedId]);

    const onWatchedItemsUpdated = useCallback(async function _onWatchedItemsUpdated(ev: DataUpdatedEventDetails<"WatchedItems">) {
        setWatchedItems(old => old?.id === ev.object.id ? ev.object as WatchedItems : null);
    }, []);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, () => {}, !watchedItems, conference);

    return watchedItems;
}
