import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, waitForElement } from "@testing-library/react";
import ConferenceSelection from "./ConferenceSelection";
import { testData } from "../../../tests/setupTests";
import Conference from "clowdr-db-schema/src/classes/DataLayer/Interface/Conference";
import "@testing-library/jest-dom/extend-expect";
import assert from "assert";
import { StaticBaseImpl } from "clowdr-db-schema/src/classes/DataLayer/Interface/Base";

jest.mock("clowdr-db-schema/src/classes/DataLayer/Cache/Cache");

const spyConference_getAll = jest.spyOn(Conference, "getAll");

describe("ConferenceSelection", () => {

    beforeEach(() => {
        spyConference_getAll.mockClear();
    });

    const TestElement = (
        failedToLoadConferences: (reason: any) => Promise<void> = async () => { },
        selectConference: (id: string | null) => Promise<boolean> = async () => { return true; }
    ) => {
        return <MemoryRouter>
            <ConferenceSelection
                failedToLoadConferences={failedToLoadConferences}
                selectConference={selectConference}
            />
        </MemoryRouter>;
    }


    const getConferences = async () => {
        const conferences = await Promise.all(
            testData.Conference.map(async conf => {
                // It's necessary to do it via StaticBaseImpl because Conference
                // is mocked, and mocks don't provide static properties.
                let confO = await StaticBaseImpl.get<"Conference", Conference>("Conference", conf.id);
                assert(confO);
                return confO;
            })
        );
        return conferences;
    };

    let testConferences: Conference[];

    beforeAll(async () => {
        testConferences = await getConferences();
    })

    it("has a welcome banner", () => {
        const element = render(TestElement());
        expect(element.getByRole("heading").className).toBe("banner");
    });

    it("displays conferences in the right order", async () => {
        const element = render(TestElement());

        const conferences = [...testConferences];
        conferences.sort((x, y) => x.name.localeCompare(y.name));

        const options = await waitForElement(
            () => element.getAllByRole("option"),
        ) as HTMLOptionElement[];

        for (let i = 0; i < options.length; i++) {
            expect(options[i].value).toBe(conferences[i].id);
            expect(options[i].textContent).toBe(conferences[i].name);
        }
    });

    it("has a join button", () => {
        const element = render(TestElement());
        expect(element.getByRole("button").textContent).toBe("Join");
    });

    it("has footer links", () => {
        const element = render(TestElement());
        const links = element.getAllByRole("link") as HTMLAnchorElement[];
        expect(links[0].textContent).toBe("About");
        expect(links[1].textContent).toBe("Legal");
        expect(links[2].textContent).toBe("Help");
    });

    it("calls selectConference", async () => {
        let selectMock = jest.fn();

        //selectMock.mockImplementation(resolve);

        const element = render(TestElement(undefined, selectMock));

        const button = await waitForElement(
            () => {
                let b = element.getByRole("button") as HTMLButtonElement;
                return !b.disabled ? b : undefined;
            }
        ) as HTMLButtonElement;

        act(() => {
            fireEvent.click(button);
        });

        expect(selectMock).toBeCalled();
    });

    it("calls failedToLoadConferences", async () => {
        let failMock = jest.fn();

        await act(() => new Promise((resolve) => {
            failMock.mockImplementation(resolve);

            spyConference_getAll.mockImplementationOnce(async () => {
                throw new Error("Intentional error - should be caught.");
            });

            render(TestElement(failMock));
        }));

        expect(failMock).toBeCalled();
    });
});
