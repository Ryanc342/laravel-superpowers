import { Form } from '@inertiajs/react';
import { KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import ConfirmDialog, {
    ConfirmDialogActions,
} from '@/components/shared/confirm-dialog';
import IconButton from '@/components/shared/icon-button';
import SubmitButton from '@/components/shared/submit-button';
import type { Passkey } from '@/types/auth';

export default function PasskeyItem({ passkey }: { passkey: Passkey }) {
    const [confirming, setConfirming] = useState(false);

    return (
        <div className="flex items-center justify-between border-b p-4 last:border-b-0">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <p className="font-medium tracking-tight">
                            {passkey.name}
                        </p>
                        {passkey.authenticator && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase ring-1 ring-border ring-inset">
                                {passkey.authenticator}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Added {passkey.created_at_diff}
                        {passkey.last_used_at_diff && (
                            <>
                                <span className="mx-1 text-muted-foreground/50">
                                    /
                                </span>
                                Last used {passkey.last_used_at_diff}
                            </>
                        )}
                    </p>
                </div>
            </div>

            <IconButton
                label={`Remove ${passkey.name}`}
                className="text-destructive-foreground hover:bg-destructive/10 hover:text-destructive-foreground"
                onClick={() => setConfirming(true)}
            >
                <Trash2 />
            </IconButton>

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={`Remove the "${passkey.name}" passkey`}
                consequence="You will no longer be able to use it to sign in."
            >
                <Form
                    noValidate
                    {...destroy.form(passkey.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setConfirming(false)}
                >
                    <ConfirmDialogActions>
                        <SubmitButton variant="destructive">
                            Remove
                        </SubmitButton>
                    </ConfirmDialogActions>
                </Form>
            </ConfirmDialog>
        </div>
    );
}
