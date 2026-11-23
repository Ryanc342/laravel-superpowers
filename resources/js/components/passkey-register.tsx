import { usePasskeyRegister } from '@laravel/passkeys/react';
import { useState } from 'react';
import { toast } from 'sonner';
import Actions from '@/components/shared/actions';
import SubmitButton from '@/components/shared/submit-button';
import TextField from '@/components/shared/text-field';
import { Button } from '@/components/ui/button';

type Props = {
    onSuccess: () => void;
};

export default function PasskeyRegistration({ onSuccess }: Props) {
    const [name, setName] = useState(() => {
        const ua = navigator.userAgent;

        const browser = [
            { pattern: /Edg|Edge/, name: 'Edge' },
            { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
            { pattern: /Firefox|FxiOS/, name: 'Firefox' },
            { pattern: /Chrome|CriOS/, name: 'Chrome' },
            { pattern: /Safari/, name: 'Safari' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        const os = [
            { pattern: /iPhone/, name: 'iPhone' },
            { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
            { pattern: /Android/, name: 'Android' },
            { pattern: /Mac/, name: 'Mac' },
            { pattern: /Windows/, name: 'Windows' },
        ].find(({ pattern }) => pattern.test(ua))?.name;

        return [browser, os].filter(Boolean).join(' on ') || '';
    });

    const [showForm, setShowForm] = useState(false);
    const { register, isLoading, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setName('');
            setShowForm(false);
            onSuccess();
        },
        onError: (error) => toast.error(error.message),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            return;
        }

        await register(name);
    };

    const handleCancel = () => {
        setShowForm(false);
        setName('');
    };

    if (!isSupported) {
        return (
            <div className="text-sm text-muted-foreground">
                Passkeys are not supported in this browser.
            </div>
        );
    }

    if (!showForm) {
        return (
            <Button variant="outline" onClick={() => setShowForm(true)}>
                Add passkey
            </Button>
        );
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-lg border border-border bg-muted/50 p-4"
        >
            <div className="grid gap-2">
                <TextField
                    id="passkey-name"
                    label="Passkey name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-describedby="passkey-name-hint"
                    autoFocus
                />
                <p
                    id="passkey-name-hint"
                    className="text-xs text-muted-foreground"
                >
                    A name helps you identify this passkey later, such as
                    MacBook Pro or iPhone.
                </p>
            </div>

            <Actions>
                <Button type="button" variant="ghost" onClick={handleCancel}>
                    Cancel
                </Button>
                <SubmitButton sending={isLoading} disabled={!name.trim()}>
                    Register passkey
                </SubmitButton>
            </Actions>
        </form>
    );
}
