import { Head, usePage } from '@inertiajs/react';
import { Button, Form, Input } from 'antd';
import {
    index as confirmOptions,
    store as confirmStore,
} from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyConfirmationController';
import FormAlerts from '@/components/auth/form-alerts';
import PasskeySignIn from '@/components/auth/passkey-sign-in';
import { msg, t } from '@/lib/i18n';
import { store } from '@/routes/password/confirm';
import { useInertiaForm } from '@/ui/form';

export default function ConfirmPassword() {
    const { features } = usePage().props;
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        store(),
        { password: '' },
        { precognitive: false, resetOnSuccess: ['password'] },
    );

    return (
        <>
            <Head title={t('Confirm password')} />

            {features.passkeys && (
                <PasskeySignIn
                    routes={{
                        options: confirmOptions(),
                        submit: confirmStore(),
                    }}
                    label={t('Confirm with passkey')}
                    loadingLabel={t('Confirming...')}
                    separator={t('Or confirm with password')}
                />
            )}

            <FormAlerts errors={unplacedErrors} />

            <Form {...formProps} noValidate>
                <Form.Item label={t('Password')} name="password" required>
                    <Input.Password
                        name="password"
                        autoFocus
                        autoComplete="current-password"
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={processing}
                        data-test="confirm-password-button"
                    >
                        {t('Confirm password')}
                    </Button>
                </Form.Item>
            </Form>
        </>
    );
}

ConfirmPassword.layout = {
    title: msg('Confirm password'),
    description: msg('Confirm your password to continue'),
};
