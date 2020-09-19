import React from "react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import ConferenceContext from "../../contexts/ConferenceContext";
import { Conference } from "clowdr-db-schema/src/classes/DataLayer";
import { render } from "@testing-library/react";
import getConference from "../../tests/getConference";

jest.mock("clowdr-db-schema/src/classes/DataLayer/Cache/Cache");

describe("Sidebar", () => {
    let testConference: Conference;

    beforeAll(async () => {
        testConference = await getConference();
    });

    it("requires a conference", () => {
        // Avoid printing the error to the console
        let error = jest.spyOn(console, 'error');
        error.mockImplementation(() => { });

        expect(() => render(<Sidebar open={false} />))
            .toThrow("Conference should be defined.");

        error.mockRestore();
    });

    it("renders with class name 'sidebar'", () => {
        let element = render(<MemoryRouter>
            <ConferenceContext.Provider value={testConference}>
                <Sidebar open={true} />
            </ConferenceContext.Provider>
        </MemoryRouter>);

        expect(element.container.children[0].className).toBe("sidebar");
    });
});
