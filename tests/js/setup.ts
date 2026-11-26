import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vite-plus/test';

// antd's overlays (Dropdown, Select, Tooltip, Modal) watch their size with
// ResizeObserver, which jsdom does not have.
vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        unobserve() {}
        disconnect() {}
    },
);

// Unmount what each test rendered, so nothing it left behind reaches the next test.
afterEach(() => {
    cleanup();
});
