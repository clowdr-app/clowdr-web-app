import { UserProfile } from "../classes/DataLayer";
import { testData } from "./setupTests";

export default async function getUserProfile() {
    const profile = await UserProfile.get(
        testData.UserProfile[0].id,
        testData.UserProfile[0].conference
    );
    expect(profile).toBeDefined();
    return profile as UserProfile;
};
