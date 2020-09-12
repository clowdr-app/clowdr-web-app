import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import ConferenceContext from "../../../contexts/ConferenceContext";
import UserProfileContext from "../../../contexts/UserProfileContext";
import Login from "./Login";
import { Conference, UserProfile } from "../../../classes/DataLayer";
import getConference from "../../../tests/getConference";
import getUserProfile from "../../../tests/getUserProfile";

describe("Login", () => {
    const TestElement = (userProfile: UserProfile) =>
        <MemoryRouter>
            <ConferenceContext.Provider value={testConference}>
                <UserProfileContext.Provider value={userProfile}>
                    <Login />
                </UserProfileContext.Provider>
            </ConferenceContext.Provider>
        </MemoryRouter>;

    let testConference: Conference;
    let testUserProfile: UserProfile;

    beforeAll(async () => {
        testConference = await getConference();
        testUserProfile = await getUserProfile();
    });

    it("renders", () => {
        let element = render(TestElement(testUserProfile));
        expect(element.container).toBeDefined();
    });
});
