import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, waitForElement } from "@testing-library/react";
import App from "./App";
import "./App.scss";
import { testData } from "../../tests/setupTests";

jest.mock("clowdr-db-schema/src/classes/DataLayer/Cache/Cache");

describe("App", () => {

    it("renders with class name 'app'", async () => {
        let element = render(<MemoryRouter>
            <App />
        </MemoryRouter>);

        expect(element.container.getElementsByClassName("app").length).toBe(1);
    });

    it("renders a page", () => {
        let element = render(<MemoryRouter>
            <App />
        </MemoryRouter>);

        expect(element.container.getElementsByClassName("page").length).toBe(1);
    });

    it("does not render a sidebar when a conference is not selected", () => {
        let element = render(<MemoryRouter>
            <App />
        </MemoryRouter>);

        expect(element.container.getElementsByClassName("sidebar").length).toBe(0);
    });

    it("renders a sidebar when a conference is selected", async () => {
        localStorage.setItem("currentConferenceId", testData.Conference[0].id);

        let element = render(<MemoryRouter>
            <App />
        </MemoryRouter>);

        let sideBarElement = await waitForElement(() => {
            let els = element.container.getElementsByClassName("sidebar");
            return els.length ? els[0] : undefined;
        });

        expect(sideBarElement).toBeDefined();
    });

    it("renders the sidebar closed by default", async () => {
        localStorage.setItem("currentConferenceId", testData.Conference[0].id);

        let element = render(<MemoryRouter>
            <App />
        </MemoryRouter>);

        let sideBarElement = await waitForElement(() => {
            let els = element.container.getElementsByClassName("sidebar-closed");
            return els.length ? els[0] : undefined;
        });

        expect(sideBarElement).toBeDefined();
    });
});
