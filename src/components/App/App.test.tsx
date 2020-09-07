import React from "react";
import { act } from "react-dom/test-utils";

import { container, renderWithRouter } from '../../tests/setupTests';

import App from "./App";

describe("App", () => {
    it("renders with class name 'app'", () => {
        act(() => {
            renderWithRouter(<App />);
        });

        console.log(`Page HTML: ${container.outerHTML}`);
        expect(container.children[0].className).toBe("app");
    });
});
