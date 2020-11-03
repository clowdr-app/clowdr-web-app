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

    useSafeAsync(async () => await profile.watched, setWatchedItems, [profile.watchedId], "useWatchedItems:setWatchedItems");

    const onWatchedItemsUpdated = useCallback(async function _onWatchedItemsUpdated(ev: DataUpdatedEventDetails<"WatchedItems">) {
        setWatchedItems(old => old ? ev.objects.find(y => old.id === y.id) as (WatchedItems | undefined) ?? old : null);
    }, []);

    useDataSubscription("WatchedItems", onWatchedItemsUpdated, null, !watchedItems, conference);

    return watchedItems;
}
