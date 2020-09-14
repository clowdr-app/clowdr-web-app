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
        const aboutEl = element.getByTitle(/about/i);
        expect(aboutEl).toBeDefined();
        expect(aboutEl.textContent).toMatch(/about/i);
    });

    it("renders a 'legal' link", () => {
        const element = render(TestElement());
        const legalEl = element.getByTitle(/legal/i);
        expect(legalEl).toBeDefined();
        expect(legalEl.textContent).toMatch(/legal/i);
    });

    it("renders a 'help' link", () => {
        const element = render(TestElement());
        const helpEl = element.getByTitle(/help/i);
        expect(helpEl).toBeDefined();
        expect(helpEl.textContent).toMatch(/help/i);
    });
});
