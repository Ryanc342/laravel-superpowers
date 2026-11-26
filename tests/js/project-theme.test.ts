import { expect, test } from 'vite-plus/test';
import projectTheme from '@/theme';

/*
 * The project's own look. The template ships this file once and the project
 * owns it: change it with `resources/js/theme.ts`. The glue's tests, which
 * hold for any theme, are in `ui/theme.test.ts`.
 */

test('the project theme uses the brand blue and Instrument Sans first', () => {
    expect(projectTheme.token?.colorPrimary).toBe('#155dfc');
    expect(
        projectTheme.token?.fontFamily?.startsWith("'Instrument Sans'"),
    ).toBe(true);
});
