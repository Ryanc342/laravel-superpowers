import { Head, usePage } from '@inertiajs/react';
/* @chisel-email-verification */
import { Link } from '@inertiajs/react';
/* @end-chisel-email-verification */
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Actions from '@/components/shared/actions';
import Section from '@/components/shared/section';
import StackedForm from '@/components/shared/stacked-form';
import StatusMessage from '@/components/shared/status-message';
import SubmitButton from '@/components/shared/submit-button';
import TextField from '@/components/shared/text-field';
import { textLinkClassName } from '@/components/text-link';
import type { Auth } from '@/types';
/* @chisel-email-verification */
import { send } from '@/routes/verification';
/* @end-chisel-email-verification */

type PageProps = {
    auth: Auth;
};

export default function Profile(
    /* @chisel-email-verification */
    {
        mustVerifyEmail,
        status,
    }: {
        mustVerifyEmail: boolean;
        status?: string;
    },
    /* @end-chisel-email-verification */
) {
    const { auth } = usePage<PageProps>().props;

    return (
        <>
            <Head title="Profile settings" />

            <Section title="Profile">
                <p className="text-sm text-muted-foreground">
                    Update your name and email address
                </p>

                <StackedForm
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                >
                    {({ errors }) => (
                        <>
                            <TextField
                                id="name"
                                label="Name"
                                defaultValue={auth.user.name}
                                name="name"
                                required
                                autoComplete="name"
                                error={errors.name}
                            />

                            <TextField
                                id="email"
                                label="Email address"
                                type="email"
                                defaultValue={auth.user.email}
                                name="email"
                                required
                                autoComplete="username"
                                error={errors.email}
                            />

                            {/* @chisel-email-verification */}
                            {mustVerifyEmail &&
                                auth.user.email_verified_at === null && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-muted-foreground">
                                            Your email address is unverified.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className={textLinkClassName}
                                            >
                                                Click here to re-send the
                                                verification email.
                                            </Link>
                                        </p>

                                        <StatusMessage
                                            message={
                                                status ===
                                                'verification-link-sent'
                                                    ? 'A new verification link has been sent to your email address.'
                                                    : undefined
                                            }
                                        />
                                    </div>
                                )}
                            {/* @end-chisel-email-verification */}

                            <Actions>
                                <SubmitButton data-test="update-profile-button">
                                    Save
                                </SubmitButton>
                            </Actions>
                        </>
                    )}
                </StackedForm>
            </Section>

            <DeleteUser />
        </>
    );
}

// The settings layout names the page and its sub-nav; no breadcrumbs.
Profile.layout = {
    breadcrumbs: [],
};
