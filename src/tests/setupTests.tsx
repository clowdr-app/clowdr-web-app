import React from "react";
import { render as domRender, unmountComponentAtNode } from "react-dom";
import { MemoryRouter } from "react-router-dom";
import Enzyme from "enzyme";
import Adapter from 'enzyme-adapter-react-16';

Enzyme.configure({ adapter: new Adapter() });

export let container: HTMLDivElement;
beforeEach(() => {
    // setup a DOM element as a render target
    container = document.createElement("div");
    document.body.appendChild(container);
});

afterEach(() => {
    // cleanup on exiting
    unmountComponentAtNode(container);
    container.remove();
});

export function renderWithRouter<T extends Element>(
    element: React.DOMElement<React.DOMAttributes<T>, T>,
    container?: Element | DocumentFragment | null,
    callback?: () => void
): T;

export function renderWithRouter(
    element: Array<React.DOMElement<React.DOMAttributes<any>, any>>,
    container?: Element | DocumentFragment | null,
    callback?: () => void
): Element;

export function renderWithRouter(
    element: React.SFCElement<any> | Array<React.SFCElement<any>>,
    container?: Element | DocumentFragment | null,
    callback?: () => void
): void;

export function renderWithRouter<P, T extends React.Component<P, React.ComponentState>>(
    element: React.CElement<P, T>,
    container?: Element | DocumentFragment | null,
    callback?: () => void
): T;

export function renderWithRouter<T extends Element>(
    element: any,
    overrideContainer?: Element | DocumentFragment | null,
    callback?: () => void
): void | Element | React.Component<T, any, any> {
    return domRender(
        <MemoryRouter>
            {element}
        </MemoryRouter>,
        overrideContainer || container,
        callback
    );
}
