import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import ConferenceContext from "../../../contexts/ConferenceContext";
import ConferenceSelection from "./ConferenceSelection";
import { Conference } from "../../../classes/DataLayer";
import getConference from "../../../tests/getConference";

describe("ConferenceSelection", () => {
    const TestElement = () =>
        <MemoryRouter>
            <ConferenceContext.Provider value={testConference}>
                <ConferenceSelection />
            </ConferenceContext.Provider>
        </MemoryRouter>;
    
    let testConference: Conference;

    beforeAll(async () => {
        testConference = await getConference();
    });

    it("renders", () => {
        let element = render(TestElement());
        expect(element.container).toBeDefined();
    });
});
