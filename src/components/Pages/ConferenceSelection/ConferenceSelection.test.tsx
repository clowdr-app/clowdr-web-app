import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import ConferenceSelection from "./ConferenceSelection";
import { testData } from "../../../tests/setupTests";
import { Conference } from "../../../classes/DataLayer";
import { removeNull } from "../../../classes/Util";

jest.mock("../../../classes/DataLayer/Cache/Cache");

describe("ConferenceSelection", () => {
    const TestElement = () =>
        <MemoryRouter>
            <ConferenceSelection />
        </MemoryRouter>;

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

    it("renders", () => {
        let element = render(TestElement());
        expect(element.container).toBeDefined();
    });

    it("has a welcome banner", () => {
        const element = render(TestElement());
        expect(element.getByRole("heading").className).toBe("banner");
    })

    it("displays conferences in the right order", () => {
        const element = render(TestElement());
        const select = element.getByRole("combobox") as HTMLSelectElement;

        const conferences = [...testConferences];
        conferences.sort((x, y) => x.conferenceName.localeCompare(y.conferenceName));

        for (let i = 0; i < select.options.length; i++) {
            expect(select.options[i].value).toBe(conferences[i].id);
            expect(select.options[i].textContent).toBe(conferences[i].conferenceName);
        }
    })

    it("has a join button", () => {
        const element = render(TestElement());
        const button = element.getByRole("button");
        expect(button.textContent).toBe("Join");
    })

    it("has bottom links", () => {
        const element = render(TestElement());
        const links = element.getAllByRole("link") as HTMLAnchorElement[];
        expect(links[0].textContent).toBe("About");
        expect(links[1].textContent).toBe("Legal");
        expect(links[2].textContent).toBe("Help");
    })
});
