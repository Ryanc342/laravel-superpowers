// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { expect, test, vi } from 'vite-plus/test';
import { useAppearance } from '@/ui/appearance';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { locale: 'en', translations: [] } }),
    router: { on: () => () => {} },
}));

import RootLayout from '@/layouts/root-layout';

function Setting() {
    const { appearance, resolved } = useAppearance();

    return <span>{`${appearance} ${resolved}`}</span>;
}

// The server has no window, document, cookie or browser setting: a render
// that reaches for one throws here, as it would in the SSR server.
test('there is no browser here', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
});

test('the appearance renders on the server as the system setting on a light browser', () => {
    expect(renderToString(<Setting />)).toBe('<span>system light</span>');
});

test('the root layout renders on the server, with its feedback and appearance', () => {
    const html = renderToString(
        <RootLayout>
            <Setting />
        </RootLayout>,
    );

    expect(html).toContain('<span>system light</span>');
});
