import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import ConferenceContext from "../../../contexts/ConferenceContext";
import Login from "./Login";
import { Conference, UserProfile } from "../../../classes/DataLayer";
import getConference from "../../../tests/getConference";
import getUserProfile from "../../../tests/getUserProfile";
import { Simulate } from "react-dom/test-utils";
import { generateMockPassword } from "../../../tests/initTestDB";

jest.mock("../../../classes/DataLayer/Cache/Cache");

describe("Login", () => {
    const mockDoLogin = jest.fn();

    const TestElement = () =>
        <MemoryRouter>
            <ConferenceContext.Provider value={testConference}>
                <Login doLogin={mockDoLogin} />
            </ConferenceContext.Provider>
        </MemoryRouter>;

    let testConference: Conference;
    let testUserProfile: UserProfile;

    beforeAll(async () => {
        testConference = await getConference();
        testUserProfile = await getUserProfile();
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
        testUserProfile = await getUserProfile();
        const testUser = await testUserProfile.user;

        let element = render(TestElement());
        let form = element.getByRole("form");
        let emailBox = element.getByLabelText(/email/i);
        let passwordBox = element.getByLabelText(/password/i);
        emailBox.setAttribute("value", testUser.email);
        passwordBox.setAttribute("value", generateMockPassword(testUser.id));

        Simulate.submit(form);
        expect(mockDoLogin).toBeCalledTimes(1);
    });

    it("calls setUser with the correct user id", () => {
        expect(false).toBe(true);
    });
});
