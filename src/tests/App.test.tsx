import React from 'react';
import { render } from '@testing-library/react';

import './mocks/matchMedia';

import App from '../App';

test('renders without crashing', () => {
    const { container } = render(<App />);
    const linkElement = container.querySelector(".ant-spin");
    expect(linkElement).toBeInTheDocument();
});
