import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, RenderResult } from "@testing-library/react";
import ConferenceContext from "../../../contexts/ConferenceContext";
import Login from "./Login";
import { Conference } from "../../../classes/DataLayer";
import getConference from "../../../tests/getConference";
import { act, Simulate } from "react-dom/test-utils";
import { generateMockPassword } from "../../../tests/initTestDB";
import { testData } from "../../../tests/setupTests";
import assert from "assert";

jest.mock("../../../classes/DataLayer/Cache/Cache");

describe("Login", () => {
    const mockDoLogin = jest.fn();

    function TestElement(resolve:
        (result: {
            email: string,
            password: string
        }) => void = () => { }) {
        mockDoLogin.mockImplementation((email: string, password: string) => {
            resolve({
                email: email,
                password: password
            });
        });

        return <MemoryRouter>
            <ConferenceContext.Provider value={testConference}>
                <Login doLogin={mockDoLogin} />
            </ConferenceContext.Provider>
        </MemoryRouter>
    };

    let testConference: Conference;

    beforeAll(async () => {
        testConference = await getConference();
    });

    beforeEach(() => {
        mockDoLogin.mockReset();
    });

    it("renders", () => {
        let element = render(TestElement());
        expect(element.container).toBeDefined();
    });

    it("renders a header", () => {
        let element = render(TestElement());
        element.getByRole("heading");
    });

    it("renders a form", () => {
        let element = render(TestElement());
        element.getByRole("form");
    });

    it("renders the email input", () => {
        let element = render(TestElement());
        let emailBox = element.getByLabelText(/email/i);
        expect(emailBox).toBeDefined();
        expect(emailBox.getAttribute("type")).toBe("email");
    });

    it("renders the password input", () => {
        let element = render(TestElement());
        let passwordBox = element.getByLabelText(/password/i);
        expect(passwordBox).toBeDefined();
        expect(passwordBox.getAttribute("type")).toBe("password");
    });

    it("renders the login button", () => {
        let element = render(TestElement());
        let loginButton = element.getByLabelText(/sign in/i);
        expect(loginButton).toBeDefined();
        expect(loginButton.tagName.toLowerCase()).toBe("input");
        expect(loginButton.getAttribute("type")).toBe("submit");
    });

    it("calls setUser when the form is submitted and the user exists", async () => {
        const testUser = testData._User[0];
        const pwd = generateMockPassword(testUser.id);

        let element: RenderResult;
        let doLogin = (resolve: () => void) => {
            return ({ email, password }: { email: string, password: string }) => {
                expect(email).toBe(testUser.email);
                expect(password).toBe(pwd);

                expect(mockDoLogin).toBeCalledTimes(1);

                resolve();
            }
        };

        let renderP = new Promise<void>((resolve) => {
            element = render(TestElement(doLogin(resolve)));
        });

        // @ts-ignore - Dangerous but seems to work..eh, JavaScript.
        assert(element);

        let form = element.getByRole("form");
        let emailBox = element.getByLabelText(/email/i);
        let passwordBox = element.getByLabelText(/password/i);

        act(() => {
            Simulate.change(emailBox, {
                // @ts-ignore
                target: { value: testUser.email }
            });
        });

        act(() => {
            Simulate.change(passwordBox, {
                // @ts-ignore
                target: { value: pwd }
            });
        });

        await act(async () => {
            Simulate.submit(form);
            await renderP;
        });
    });

    it("has bottom links", () => {
        const element = render(TestElement());
        const links = element.getAllByRole("link") as HTMLAnchorElement[];
        expect(links[0].textContent).toBe("About");
        expect(links[1].textContent).toBe("Legal");
        expect(links[2].textContent).toBe("Help");
    });

    it("displays an error message when login fails", () => {
        fail();
    });

    it("clears the password field on submit", async () => {
        const element = render(TestElement());
        const form = element.getByRole("form");
        const passwordBox = element.getByLabelText(/password/i) as HTMLInputElement;

        act(() => Simulate.submit(form));

        expect(passwordBox.value).toBe("");
    });

    it("clears the email field on submit", async () => {
        const element = render(TestElement());
        const form = element.getByRole("form");
        const emailBox = element.getByLabelText(/email/i) as HTMLInputElement;

        act(() => Simulate.submit(form));

        expect(emailBox.value).toBe("");
    });
});
