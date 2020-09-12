import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import Page from "./Page";
import ConferenceContext from "../../contexts/ConferenceContext";
import UserProfileContext from "../../contexts/UserProfileContext";
import ConferenceSelection from "../Pages/ConferenceSelection/ConferenceSelection";
import { Conference, UserProfile } from "../../classes/DataLayer";

jest.mock("../Pages/ConferenceSelection/ConferenceSelection");

describe("Page", () => {
    const PageTestElement = (conference: Conference | null, userProfile: UserProfile | null) =>
        <MemoryRouter>
            <ConferenceContext.Provider value={conference}>
                <UserProfileContext.Provider value={userProfile}>
                    <Page />
                </UserProfileContext.Provider>
            </ConferenceContext.Provider>
        </MemoryRouter>;

    it("renders with class name 'page'", () => {
        let element = render(PageTestElement(null, null));

        expect(element.container.children[0].className).toBe("page");
    });

    it("renders the conference selection page", async () => {
        let mockPage = ConferenceSelection as jest.MockedFunction<() => JSX.Element>;
        mockPage.mockImplementation(() => <></>);

        render(PageTestElement(null, null));

        expect(mockPage).toBeCalledTimes(1);

        mockPage.mockRestore();
    });
});
