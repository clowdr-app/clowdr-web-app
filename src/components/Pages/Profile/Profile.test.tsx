import React from "react";
import Parse from "parse";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

import Profile from "./Profile";
import ProfileView from "../../Profile/ProfileView/ProfileView";
import ProfileEditor from "../../Profile/ProfileEditor/ProfileEditor";

import { mocked } from "ts-jest/utils";
import getConference from "../../../tests/getConference";
import getUserProfile from "../../../tests/getUserProfile";
import { Conference, UserProfile, _User } from "@clowdr-app/clowdr-db-schema";
import ConferenceContext from "../../../contexts/ConferenceContext";
import UserProfileContext from "../../../contexts/UserProfileContext";
import HeadingContext from "../../../contexts/HeadingContext";
import { generateMockPassword } from "../../../tests/initTestDB";

import waitForExpect from "wait-for-expect";

jest.mock("../../../classes/DataLayer/Cache/Cache");

jest.mock("../../Profile/ProfileView/ProfileView", () => {
    const component = jest.requireActual("../../Profile/ProfileView/ProfileView");
    return jest.fn(component.default);
});
jest.mock("../../Profile/ProfileEditor/ProfileEditor", () => {
    const component = jest.requireActual("../../Profile/ProfileEditor/ProfileEditor");
    return jest.fn(component.default);
});

describe("Profile", () => {
    const mockProfileView = mocked(ProfileView);
    const mockProfileEditor = mocked(ProfileEditor);

    let testConference: Conference;
    let testUserProfile: UserProfile;
    let otherTestUserProfile: UserProfile;

    const TestElement = (userProfileId: string) =>
        <MemoryRouter>
            <HeadingContext.Provider value={jest.fn()}>
                <ConferenceContext.Provider value={testConference}>
                    <UserProfileContext.Provider value={testUserProfile}>
                        <Profile userProfileId={userProfileId} />
                    </UserProfileContext.Provider>
                </ConferenceContext.Provider>
            </HeadingContext.Provider>
        </MemoryRouter>;

    beforeAll(async () => {
        await _User.logIn("mock@mock.com", generateMockPassword("TODO"));
        testConference = await getConference();
        testUserProfile = await getUserProfile(0);
        otherTestUserProfile = await getUserProfile(1);
    });

    afterAll(async () => {
        await Parse.User.logOut();
    });

    beforeEach(() => {
        mockProfileView.mockClear();
        mockProfileEditor.mockClear();
    });

    it("renders the profile editor for the logged in user", () => {
        mockProfileEditor.mockImplementationOnce(() => <></>);

        render(TestElement(testUserProfile.id));

        expect(mockProfileEditor).toBeCalledTimes(1);
    });

    it("renders the profile view for another user", async () => {
        mockProfileView.mockImplementationOnce(() => <></>);

        render(TestElement(otherTestUserProfile.id));

        await waitForExpect(() => {
            expect(mockProfileView).toBeCalledTimes(1);
        })
    });
});
