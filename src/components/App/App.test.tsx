import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, waitForElement } from "@testing-library/react";
// TODO: import Cache from "../../classes/Cache/Cache";
import App from "./App";

jest.mock("../../classes/Cache/Cache.ts");

describe("App", () => {
    const MockedCache: any = Cache as jest.Mocked<typeof Cache>;

    it("renders with class name 'app'", () => {
        let element = render(<MemoryRouter>
            <App />
        </MemoryRouter>);

        expect(element.container.children[0].className).toBe("app");
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

        MockedCache.mockCacheData = {
            get: (tableName: string, id: string) => {
                if (tableName === "ClowdrInstance" && id === "mock_id") {
                    return Promise.resolve({
                        id: "mock_id",
                        conferenceName: "mock_conferenceName"
                    });
                }

                return Promise.resolve(undefined);
            },
            getAll: (tableName: string) => {
                return Promise.resolve([]);
            },
            transaction: (tableName: string) => {
                return { done: Promise.resolve() };
            }
        };

        sessionStorage.setItem("currentConferenceId", "mock_id");

        let element = render(<MemoryRouter>
            <App />
        </MemoryRouter>);

        const sideBarElements = await waitForElement(() => element.container.getElementsByClassName("sidebar"));

        expect(sideBarElements.length).toBe(1);
    });
});
