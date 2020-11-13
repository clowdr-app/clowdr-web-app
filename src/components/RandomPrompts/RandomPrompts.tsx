import React, { useEffect, useMemo } from "react";
import { addNotification } from "../../classes/Notifications/Notifications";
import useMaybeUserProfile from "../../hooks/useMaybeUserProfile";

export function randomBackoff(profileCreatedAt: Date | number, determinant: number, startingHours: number, startingLimit: number = 1) {
    const profileCreationOffset = Date.now() - (typeof profileCreatedAt === "number" ? profileCreatedAt : profileCreatedAt.getTime());
    return determinant < startingLimit * 0.05 ||
        (profileCreationOffset < (1000 * 60 * 60 * startingHours * 16) && determinant < startingLimit * 0.1) ||
        (profileCreationOffset < (1000 * 60 * 60 * startingHours * 8) && determinant < startingLimit * 0.2) ||
        (profileCreationOffset < (1000 * 60 * 60 * startingHours * 4) && determinant < startingLimit * 0.4) ||
        (profileCreationOffset < (1000 * 60 * 60 * startingHours * 2) && determinant < startingLimit * 0.8) ||
        (profileCreationOffset < (1000 * 60 * 60 * startingHours) && determinant < startingLimit);
}

export default function RandomPrompts() {
    const mUser = useMaybeUserProfile();
    const randomDeterminant = useMemo(() => Math.random(), []);

    const profileCreatedAtTime = mUser?.createdAt.getTime();
    useEffect(() => {
        if (profileCreatedAtTime) {
            const showTimezoneNotification = randomBackoff(profileCreatedAtTime, randomDeterminant, 4, 0.2);
            if (showTimezoneNotification) {
                addNotification("Hint: Clowdr displays all times in your local timezone.");
            }
        }
    }, [profileCreatedAtTime, randomDeterminant]);

    return <></>;
}
