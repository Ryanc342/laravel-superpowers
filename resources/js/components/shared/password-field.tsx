import { Eye, EyeOff } from 'lucide-react';
import { useId, useState, type ComponentProps } from 'react';
import {
    FieldError,
    FloatingLabel,
    fieldErrorProps,
    floatingControl,
} from '@/components/shared/form-field';
import IconButton from '@/components/shared/icon-button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * A password field: the user's current password or a new one. Use it for
 * every password. A button at its end shows or hides what was typed, unless
 * `revealable={false}`: a stored secret (an API key) stays masked. Its label
 * is required and floats inside the box; `error` works as in TextField.
 */
export default function PasswordField({
    label,
    error,
    id,
    className,
    revealable = true,
    'aria-describedby': describedBy,
    ...props
}: Omit<ComponentProps<typeof Input>, 'type' | 'placeholder' | 'size'> & {
    label: string;
    error?: string;
    /** Whether the show/hide button is there. */
    revealable?: boolean;
}) {
    const fallbackId = useId();
    const inputId = id ?? fallbackId;
    const [shown, setShown] = useState(false);

    return (
        <div className={cn('relative', className)}>
            <Input
                id={inputId}
                type={shown ? 'text' : 'password'}
                size={revealable ? 'end-icon' : undefined}
                placeholder=" "
                className={floatingControl}
                {...props}
                {...fieldErrorProps(inputId, error, describedBy)}
            />
            <FloatingLabel htmlFor={inputId}>{label}</FloatingLabel>
            {revealable && (
                <IconButton
                    label={shown ? 'Hide password' : 'Show password'}
                    size="icon-sm"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShown((current) => !current)}
                >
                    {shown ? <EyeOff /> : <Eye />}
                </IconButton>
            )}
            <FieldError htmlFor={inputId} message={error} />
        </div>
    );
}
