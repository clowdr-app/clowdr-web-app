import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { testData } from "./setupTests";

export default async function getUserProfile(idx: number = 0) {
    const profile = await UserProfile.get(
        testData.UserProfile[idx].id,
        testData.UserProfile[idx].conference
    );
    if (!profile) {
        throw new Error("Could not get user profile!");
    }
    return profile as UserProfile;
};
