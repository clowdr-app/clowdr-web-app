import React from "react";
import { MemoryRouter } from "react-router-dom";
import { act, render, waitForElement } from "@testing-library/react";
import ConferenceContext from "../../../contexts/ConferenceContext";
import Login from "./Login";
import { Conference } from "clowdr-db-schema/src/classes/DataLayer";
import getConference from "../../../tests/getConference";
import { Simulate } from "react-dom/test-utils";
import { generateMockPassword } from "../../../tests/initTestDB";
import { testData } from "../../../tests/setupTests";
import DocTitleContext from "../../../contexts/DocTitleContext";

jest.mock("clowdr-db-schema/src/classes/DataLayer/Cache/Cache");

describe("Login", () => {
    const mockDoLogin = jest.fn();

    function TestElement(resolve:
        (result: {
            email: string,
            password: string
        }) => void = () => { }) {
        mockDoLogin.mockImplementation(async (email: string, password: string) => {
            resolve({
                email: email,
                password: password
            });
        });

        return <MemoryRouter>
            <DocTitleContext.Provider value={jest.fn()}>
                <ConferenceContext.Provider value={testConference}>
                    <Login showSignUp={true} doLogin={mockDoLogin} clearSelectedConference={jest.fn()} />
                </ConferenceContext.Provider>
            </DocTitleContext.Provider>
        </MemoryRouter>
    };

    let testConference: Conference;

    beforeAll(async () => {
        testConference = await getConference();
    });

    beforeEach(() => {
        mockDoLogin.mockReset();
    });

    // it("renders", () => {
    //     let element = render(TestElement());
    //     expect(element.container).toBeDefined();
    // });

    // it("renders a header", () => {
    //     let element = render(TestElement());
    //     element.getByRole("heading");
    // });

    // it("renders a form", () => {
    //     let element = render(TestElement());
    //     element.getByRole("form");
    // });

    // it("renders the email input", () => {
    //     let element = render(TestElement());
    //     let emailBox = element.getByLabelText(/email/i);
    //     expect(emailBox).toBeDefined();
    //     expect(emailBox.getAttribute("type")).toBe("email");
    // });

    // it("renders the email input without a value", () => {
    //     let element = render(TestElement());
    //     let emailBox = element.getByLabelText(/email/i) as HTMLInputElement;
    //     expect(emailBox.value).toBeDefined();
    //     expect(emailBox.value.length).toBe(0);
    // });

    // it("renders the email input with a placeholder", () => {
    //     let element = render(TestElement());
    //     let emailBox = element.getByLabelText(/email/i);
    //     expect(emailBox.getAttribute("placeholder")).toBeDefined();
    //     expect(emailBox.getAttribute("placeholder")?.length).toBeGreaterThan(0);
    // });

    // it("renders the email input with the 'required' attribute", () => {
    //     let element = render(TestElement());
    //     let emailBox = element.getByLabelText(/email/i);
    //     expect(emailBox.getAttribute("required")).toBeDefined();
    //     expect(emailBox.getAttribute("required")).toBe("");
    // });

    // it("renders the password input", () => {
    //     let element = render(TestElement());
    //     let passwordBox = element.getByLabelText(/password/i);
    //     expect(passwordBox).toBeDefined();
    //     expect(passwordBox.getAttribute("type")).toBe("password");
    // });

    // it("renders the password input without a value", () => {
    //     let element = render(TestElement());
    //     let passwordBox = element.getByLabelText(/password/i) as HTMLInputElement;
    //     expect(passwordBox.value).toBeDefined();
    //     expect(passwordBox.value.length).toBe(0);
    // });

    // it("renders the password input with a placeholder", () => {
    //     let element = render(TestElement());
    //     let passwordBox = element.getByLabelText(/password/i);
    //     expect(passwordBox.getAttribute("placeholder")).toBeDefined();
    //     expect(passwordBox.getAttribute("placeholder")?.length).toBeGreaterThan(0);
    // });

    // it("renders the password input with the 'required' attribute", () => {
    //     let element = render(TestElement());
    //     let passwordBox = element.getByLabelText(/password/i);
    //     expect(passwordBox.getAttribute("required")).toBeDefined();
    //     expect(passwordBox.getAttribute("required")).toBe("");
    // });

    // it("renders the login button", () => {
    //     let element = render(TestElement());
    //     let loginButton = element.getByLabelText(/sign in/i);
    //     expect(loginButton).toBeDefined();
    //     expect(loginButton.tagName.toLowerCase()).toBe("input");
    //     expect(loginButton.getAttribute("type")).toBe("submit");
    // });

    it("calls setUser when the form is submitted and the user exists", async (done) => {
        const testUser = testData._User[0];
        const pwd = generateMockPassword(testUser.id);

        const doLogin = (resolve: () => void) => {
            return ({ email, password }: { email: string, password: string }) => {
                expect(email).toBe(testUser.email);
                expect(password).toBe(pwd);

                expect(mockDoLogin).toBeCalledTimes(1);

                resolve();
            }
        };

        const element = render(TestElement(doLogin(done)));
        const form = element.getByRole("form");
        const emailBox = element.getByLabelText(/email/i);
        const passwordBox = element.getByLabelText(/password/i);

        await act(async () => {
            Simulate.change(emailBox, {
                // @ts-ignore
                target: { value: testUser.email }
            });

            Simulate.change(passwordBox, {
                // @ts-ignore
                target: { value: pwd }
            });
        });

        await act(async () => {
            Simulate.submit(form);
        });

        return null;
    });

    it("displays an error message when login fails", async () => {
        await act(async () => {
            const element = render(TestElement());
            const form = element.getByRole("form");

            act(() => Simulate.submit(form));
            const errorMsg = await waitForElement(() => {
                return element.getByText(/unable/i);
            });

            expect(errorMsg).toBeDefined();
        });
    });

    it("clears the password field on submit", async () => {
        await act(async () => {
            const element = render(TestElement());
            const form = element.getByRole("form");
            const passwordBox = element.getByLabelText(/password/i) as HTMLInputElement;

            act(() => Simulate.submit(form));

            expect(passwordBox.value).toBe("");
        });
    });

    it("clears the email field on submit", async () => {
        await act(async () => {
            const element = render(TestElement());
            const form = element.getByRole("form");
            const emailBox = element.getByLabelText(/email/i) as HTMLInputElement;

            act(() => Simulate.submit(form));

            expect(emailBox.value).toBe("");
        });
    });
});
