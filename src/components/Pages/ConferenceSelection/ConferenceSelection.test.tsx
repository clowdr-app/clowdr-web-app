import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitForElement } from "@testing-library/react";
import ConferenceSelection from "./ConferenceSelection";
import { testData } from "../../../tests/setupTests";
import { Conference } from "../../../classes/DataLayer";
import { removeNull } from "../../../classes/Util";
import "@testing-library/jest-dom/extend-expect";

jest.mock("../../../classes/DataLayer/Cache/Cache");

describe("ConferenceSelection", () => {
    const TestElement = (selectConference: (id: string) => Promise<void> = async () => { }) => {
        return <MemoryRouter>
            <ConferenceSelection selectConference={selectConference} />
        </MemoryRouter>;
    }


    const getConferences = async () => {
        const conferences = await Promise.all(
            testData.Conference.map(conf => Conference.get(conf.id))
        );
        return removeNull(conferences);
    };

    let testConferences: Conference[];

    beforeAll(async () => {
        testConferences = await getConferences();
    })

    it("has a welcome banner", () => {
        render(TestElement());
        expect(screen.getByRole("heading").className).toBe("banner");
    });

    it("displays conferences in the right order", async () => {
        render(TestElement());

        const conferences = [...testConferences];
        conferences.sort((x, y) => x.conferenceName.localeCompare(y.conferenceName));

        const options = await waitForElement(
            () => screen.getAllByRole("option"),
        ) as HTMLOptionElement[];

        for (let i = 0; i < options.length; i++) {
            expect(options[i].value).toBe(conferences[i].id);
            expect(options[i].textContent).toBe(conferences[i].conferenceName);
        }
    });

    it("has a join button", () => {
        render(TestElement());
        expect(screen.getByRole("button").textContent).toBe("Join");
    });

    it("has bottom links", () => {
        render(TestElement());
        const links = screen.getAllByRole("link") as HTMLAnchorElement[];
        expect(links[0].textContent).toBe("About");
        expect(links[1].textContent).toBe("Legal");
        expect(links[2].textContent).toBe("Help");
    });
});
