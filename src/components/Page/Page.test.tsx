import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import Page from "./Page";

describe("Page", () => {
    it("renders with class name 'page'", () => {
        let element = render(<MemoryRouter>
            <Page />
        </MemoryRouter>);

        expect(element.container.children[0].className).toBe("page");
    });
});
