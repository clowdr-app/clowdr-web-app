import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import Page from "./Page";
import ConferenceContext from "../../contexts/ConferenceContext";
import UserProfileContext from "../../contexts/UserProfileContext";

describe("Page", () => {
    it("renders with class name 'page'", () => {
        let element = render(<MemoryRouter>
            <ConferenceContext.Provider value={null}>
                <UserProfileContext.Provider value={null}>
                    <Page />
                </UserProfileContext.Provider>
            </ConferenceContext.Provider>
        </MemoryRouter>);

        expect(element.container.children[0].className).toBe("page");
    });
});
