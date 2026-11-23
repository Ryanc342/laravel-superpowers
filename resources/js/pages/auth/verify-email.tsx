import { Head } from '@inertiajs/react';
import StackedForm from '@/components/shared/stacked-form';
import StatusMessage from '@/components/shared/status-message';
import SubmitButton from '@/components/shared/submit-button';
import TextLink from '@/components/text-link';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Email verification" />

            <div className="grid gap-6">
                <StatusMessage
                    message={
                        status === 'verification-link-sent'
                            ? 'A new verification link has been sent to the email address you provided during registration.'
                            : undefined
                    }
                />

                <StackedForm {...send.form()} wideButtons>
                    <SubmitButton variant="secondary">
                        Resend verification email
                    </SubmitButton>
                </StackedForm>

                <TextLink href={logout()} className="mx-auto text-sm">
                    Log out
                </TextLink>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Email verification',
    description:
        'Please verify your email address by clicking on the link we just emailed to you.',
};
