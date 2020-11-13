import React from 'react';

export interface HeadingState {
    title: string;
    icon?: JSX.Element;
    iconOnly?: boolean;
    subtitle?: JSX.Element;
    buttons?: Array<ActionButton>;
}

export interface ActionButton {
    label: string;
    action: string | ((ev: React.FormEvent<HTMLButtonElement>) => void);
    icon: JSX.Element;
    ariaLabel: string;
}

/**
 * Hint: You will never need to use this directly. Instead, use the
 * `useHeading` hook.
 */
const Context = React.createContext<((val: HeadingState) => void) | null>(null);

export default Context;
