import 'jest-localstorage-mock';
import { cleanup } from '@testing-library/react-hooks';

// import { unmountComponentAtNode } from "react-dom";
// import { act } from "react-dom/test-utils";

jest.useFakeTimers();

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    // jest.clearAllMocks();
    cleanup();
});

// export const waitForComponentToPaint = async (wrapper: any) => {
//     await act(async () => {
//         await new Promise(resolve => setTimeout(resolve, 0));
//         wrapper.update();
//     });
// };
