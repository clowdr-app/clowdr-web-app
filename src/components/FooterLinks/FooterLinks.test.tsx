import { render } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import FooterLinks from "./FooterLinks";

describe("Footer Links", () => {
    const TestElement = () =>
        <MemoryRouter>
            <FooterLinks />
        </MemoryRouter>;

    it("renders", () => {
        expect(render(TestElement())).toBeDefined();
    });

    it("renders an 'about' link", () => {
        const element = render(TestElement());
        const aboutEl = element.getByText(/about/i);
        expect(aboutEl).toBeDefined();
    });

    it("renders a 'legal' link", () => {
        const element = render(TestElement());
        const legalEl = element.getByText(/legal/i);
        expect(legalEl).toBeDefined();
    });

    it("renders a 'help' link", () => {
        const element = render(TestElement());
        const helpEl = element.getByText(/help/i);
        expect(helpEl).toBeDefined();
    });
});
