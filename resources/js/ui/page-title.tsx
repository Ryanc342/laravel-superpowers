import type { ReactNode } from 'react';

/**
 * A page's title as its one h1, in the look of the container it is in: a
 * `PageContainer`'s title, a `Result`'s. Those render the title in a span or
 * a div, so the page makes the heading itself.
 */
export default function PageTitle({ children }: { children: ReactNode }) {
    return <h1 style={{ margin: 0, font: 'inherit' }}>{children}</h1>;
}
