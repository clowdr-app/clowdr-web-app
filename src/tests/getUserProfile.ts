import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import { testData } from "./setupTests";

export default async function getUserProfile() {
    const profile = await UserProfile.get(
        testData.UserProfile[0].id,
        testData.UserProfile[0].conference
    );
    if (!profile) {
        throw new Error("Could not get user profile!");
    }
    return profile as UserProfile;
};
