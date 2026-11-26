import { expect, test } from 'vite-plus/test';
import Dashboard from '@/pages/dashboard';
import OrdersIndex from '@/pages/examples/orders/index';
import { resolvePage } from '@/ui/pages';

// The tests are built as local or testing builds are, with the examples.
test('a page resolves by its name, the examples too in a build that has them', async () => {
    expect(await resolvePage('dashboard')).toBe(Dashboard);
    expect(await resolvePage('examples/orders/index')).toBe(OrdersIndex);
});

test('a name with no page is an error', async () => {
    await expect(resolvePage('no/such/page')).rejects.toThrow(
        'Page not found: no/such/page',
    );
});
