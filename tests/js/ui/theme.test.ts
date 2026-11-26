import { expect, test } from 'vite-plus/test';
import { themeConfig } from '@/ui/theme';

test('the project theme wins over the template defaults', () => {
    expect(
        themeConfig({ token: { colorPrimary: '#ff0000' } }).token?.colorPrimary,
    ).toBe('#ff0000');
});

test('the template always keeps its css variable key and zero runtime', () => {
    const config = themeConfig({});

    expect(config.cssVar).toEqual({ key: 'app' });
    expect(config.zeroRuntime).toBe(true);
});
