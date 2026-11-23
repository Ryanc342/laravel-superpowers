import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Link>;

/** The look of a link inside running text, for a `<button>` that reads as one too. */
export const textLinkClassName =
    'text-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current!';

export default function TextLink({
    className = '',
    children,
    ...props
}: Props) {
    return (
        <Link className={cn(textLinkClassName, className)} {...props}>
            {children}
        </Link>
    );
}
