import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

import ConferenceContext from "../../contexts/ConferenceContext";
import UserProfileContext from "../../contexts/UserProfileContext";

import Page from "./Page";
import ConferenceSelection from "../Pages/ConferenceSelection/ConferenceSelection";
import Login from "../Pages/Login/Login";
import LoggedInWelcome from "../Pages/LoggedInWelcome/LoggedInWelcome";

import { Conference, UserProfile } from "../../classes/DataLayer";
import { mocked } from "ts-jest/utils";
import getConference from "../../tests/getConference";
import getUserProfile from "../../tests/getUserProfile";

jest.mock("../../classes/DataLayer/Cache/Cache");

// Note: We tried to improve this but functions don't execute at module load
// time so there doesn't seem to be a way to avoid the (minor) bloat.
jest.mock("../Pages/ConferenceSelection/ConferenceSelection", () => {
    const component = jest.requireActual("../Pages/ConferenceSelection/ConferenceSelection");
    return jest.fn(component.default);
});
jest.mock("../Pages/Login/Login", () => {
    const component = jest.requireActual("../Pages/Login/Login");
    return jest.fn(component.default);
});
jest.mock("../Pages/LoggedInWelcome/LoggedInWelcome", () => {
    const component = jest.requireActual("../Pages/LoggedInWelcome/LoggedInWelcome");
    return jest.fn(component.default);
});

describe("Page", () => {
    const mockConferenceSelection = mocked(ConferenceSelection);
    const mockLogin = mocked(Login);
    const mockLoggedInWelcome = mocked(LoggedInWelcome);

    const TestElement = (conference: Conference | null, userProfile: UserProfile | null) =>
        <MemoryRouter>
            <ConferenceContext.Provider value={conference}>
                <UserProfileContext.Provider value={userProfile}>
                    <Page
                        doLogin={jest.fn()}
                        failedToLoadConferences={jest.fn()}
                        selectConference={jest.fn()} />
                </UserProfileContext.Provider>
            </ConferenceContext.Provider>
        </MemoryRouter>;

    let testConference: Conference;
    let testUserProfile: UserProfile;

    beforeAll(async () => {
        testConference = await getConference();
        testUserProfile = await getUserProfile();
    });

    beforeEach(() => {
        mockConferenceSelection.mockClear();
        mockLogin.mockClear();
        mockLoggedInWelcome.mockClear();
    });

    it("renders with class name 'page'", () => {
        let element = render(TestElement(null, null));

        expect(element.container.children[0].className).toBe("page");
    });

    it("renders the conference selection page", async () => {
        mockConferenceSelection.mockImplementationOnce(() => <></>);

        render(TestElement(null, null));

        expect(mockConferenceSelection).toBeCalledTimes(1);
    });

    it("does not render the conference selection page", async () => {
        mockConferenceSelection.mockImplementationOnce(() => <></>);

        render(TestElement(testConference, null));

        expect(mockConferenceSelection).toBeCalledTimes(0);
    });

    it("renders the login page", async () => {
        mockLogin.mockImplementationOnce(() => <></>);

        render(TestElement(testConference, null));

        expect(mockLogin).toBeCalledTimes(1);
    });

    it("does not render the login page when logged in", async () => {
        mockLogin.mockImplementationOnce(() => <></>);

        render(TestElement(testConference, testUserProfile));

        expect(mockLogin).toBeCalledTimes(0);
    });

    it("does not render the conference selection page when logged in", async () => {
        mockConferenceSelection.mockImplementationOnce(() => <></>);

        render(TestElement(testConference, testUserProfile));

        expect(mockConferenceSelection).toBeCalledTimes(0);
    });

    it("renders the logged in welcome page", async () => {
        mockLoggedInWelcome.mockImplementationOnce(() => <></>);

        render(TestElement(testConference, testUserProfile));

        expect(mockLoggedInWelcome).toBeCalledTimes(1);
    });
});
