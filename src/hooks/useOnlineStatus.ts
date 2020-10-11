import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { useEffect, useState } from "react";
import useMaybeChat from "./useMaybeChat";
import useSafeAsync from "./useSafeAsync";

export default function useOnlineStatus(userProfiles: UserProfile[]): Map<string, boolean> {
    const [onlineStatus, setOnlineStatus] = useState<Map<string, boolean>>(new Map());
    const mChat = useMaybeChat();

    useSafeAsync(async () => {
        const newStatuses = new Map(onlineStatus);
        await Promise.all(userProfiles?.map(async profile => {
            const online = await mChat?.getIsUserOnline(profile.id);
            if (online !== undefined) {
                newStatuses.set(profile.id, online);
            } else if (onlineStatus.has(profile.id)) {
                newStatuses.delete(profile.id);
            }
        }));
        return newStatuses;
    }, setOnlineStatus, [userProfiles, mChat])

    useEffect(() => {
        if (mChat) {
            const functionToOff = mChat.serviceEventOn("userUpdated", (update) => {
                if (update.updateReasons.includes("online")) {
                    setOnlineStatus(status => {
                        const newStatus = new Map(status);
                        if (update.user.isOnline !== undefined) {
                            newStatus.set(update.user.profileId, update.user.isOnline);
                        } else if (newStatus.has(update.user.profileId)) {
                            newStatus.delete(update.user.profileId);
                        }
                        return newStatus;
                    })
                }
            });
            return async () => {
                mChat.serviceEventOff("userUpdated", await functionToOff);
            };
        }
        return () => { };
    }, [mChat]);

    return onlineStatus;
}