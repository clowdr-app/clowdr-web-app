import React from "react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import ConferenceContext from "../../contexts/ConferenceContext";
import { Conference } from "../../classes/Data/Conference";
import { render } from "@testing-library/react";

const MockConference: Conference = new Conference({
    adminEmail: "mock_adminEmail",
    adminName: "mock_adminName",
    conferenceName: "mock_conferenceName",
    createdAt: new Date(),
    headerImage: null,
    id: "mock_id",
    isInitialized: false,
    landingPage: "mock_landingPage",
    updatedAt: new Date(),
    welcomeText: "mock_welcomeText"
});

describe("Sidebar", () => {
    it("requires a conference", () => {
        // Avoid printing the error to the console
        let error = jest.spyOn(console, 'error');
        error.mockImplementation(() => { });

        expect(() => render(<Sidebar />))
            .toThrow("Conference should be defined.");

        error.mockRestore();
    });

    it("renders with class name 'sidebar'", () => {
        let element = render(<MemoryRouter>
                <ConferenceContext.Provider value={MockConference}>
                    <Sidebar />
                </ConferenceContext.Provider>
            </MemoryRouter>);

        expect(element.container.children[0].className).toBe("sidebar");
    });
});
