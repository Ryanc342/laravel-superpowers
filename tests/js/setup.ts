import { cleanup } from '@testing-library/react';
import { afterEach } from 'vite-plus/test';

// Unmount what each test rendered, so nothing it left behind reaches the next test.
afterEach(() => {
    cleanup();
});
