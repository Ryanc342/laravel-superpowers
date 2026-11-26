import { loadEnv } from 'vite';

/** The environments the page-type examples exist in: EnsureExamplesExist::ENVIRONMENTS. */
const EXAMPLE_ENVIRONMENTS = ['local', 'testing'];

/**
 * Whether a build has the page-type examples, which vite.config.ts fixes as
 * `__EXAMPLES__` when the build starts (`ui/pages.ts`). Only a local or
 * testing app has their routes, and a build's route functions are generated
 * from the app's routes, so a build for anywhere else leaves their pages out.
 *
 * APP_ENV comes from the command line (`APP_ENV=production npm run build`),
 * else from `.env` in `root`. Laravel reads no APP_ENV as production, and so
 * does this.
 */
export function buildHasExamples(root: string = process.cwd()): boolean {
    const { APP_ENV } = loadEnv('', root, 'APP_ENV');

    return EXAMPLE_ENVIRONMENTS.includes(APP_ENV ?? 'production');
}
