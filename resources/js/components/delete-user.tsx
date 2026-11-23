import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import ConfirmButton from '@/components/shared/confirm-button';
import PasswordField from '@/components/shared/password-field';
import Section from '@/components/shared/section';

export default function DeleteUser() {
    return (
        <Section title="Delete account">
            <p className="text-sm text-muted-foreground">
                Delete your account and all of its resources
            </p>
            <div className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <div className="space-y-0.5 text-destructive-foreground">
                    <p className="font-medium">Warning</p>
                    <p className="text-sm">
                        Please proceed with caution, this cannot be undone.
                    </p>
                </div>

                <ConfirmButton
                    form={ProfileController.destroy.form()}
                    title="Delete your account"
                    consequence="Once your account is deleted, all of its resources and data will also be permanently deleted. Enter your password to confirm."
                    fields={(errors) => (
                        <PasswordField
                            id="password"
                            label="Password"
                            name="password"
                            autoComplete="current-password"
                            error={errors.password}
                        />
                    )}
                    variant="destructive"
                    data-test="delete-user-button"
                >
                    Delete account
                </ConfirmButton>
            </div>
        </Section>
    );
}
