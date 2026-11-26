import { expect, test } from 'vite-plus/test';
import projectTheme from '@/theme';
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

test('the shipped project theme uses the brand blue and Instrument Sans first', () => {
    expect(projectTheme.token?.colorPrimary).toBe('#155dfc');
    expect(
        projectTheme.token?.fontFamily?.startsWith("'Instrument Sans'"),
    ).toBe(true);
});
