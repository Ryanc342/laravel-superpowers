import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    // Flash and network messages are antd's (RootLayout), and a validation error
    // shows under its field or in the form's Alert, never as a toast.
    return (
        <Sonner
            theme={appearance}
            className="toaster group"
            containerAriaLabel="Notifications"
            position="top-center"
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
