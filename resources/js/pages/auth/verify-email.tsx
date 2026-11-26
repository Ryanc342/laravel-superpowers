import { Head } from '@inertiajs/react';
import { Button, Flex, Form } from 'antd';
import FormAlerts from '@/components/auth/form-alerts';
import { signOut } from '@/components/user-menu';
import { msg, t } from '@/lib/i18n';
import { send } from '@/routes/verification';
import { useInertiaForm } from '@/ui/form';

export default function VerifyEmail({ status }: { status?: string }) {
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        send(),
        {},
        { precognitive: false },
    );

    return (
        <>
            <Head title={t('Verify your email address')} />

            <FormAlerts
                status={
                    status === 'verification-link-sent'
                        ? t(
                              'A new verification link has been sent to the email address you provided during registration.',
                          )
                        : undefined
                }
                errors={unplacedErrors}
            />

            <Form {...formProps}>
                <Form.Item>
                    <Button htmlType="submit" loading={processing}>
                        {t('Resend verification email')}
                    </Button>
                </Form.Item>

                <Flex justify="center">
                    <Button type="link" onClick={signOut}>
                        {t('Log out')}
                    </Button>
                </Flex>
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: msg('Verify your email address'),
    description: msg('Click the link in the email we sent you'),
};
