import { Head, Link } from '@inertiajs/react';
import { Button, Flex, Form, Input, Typography } from 'antd';
import FormAlerts from '@/components/auth/form-alerts';
import { msg, t } from '@/lib/i18n';
import { login } from '@/routes';
import { email } from '@/routes/password';
import { useInertiaForm } from '@/ui/form';

export default function ForgotPassword({ status }: { status?: string }) {
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        email(),
        { email: '' },
        { precognitive: false },
    );

    return (
        <>
            <Head title={t('Forgot password')} />

            <FormAlerts status={status} errors={unplacedErrors} />

            <Form {...formProps}>
                <Form.Item label={t('Email address')} name="email" required>
                    <Input
                        name="email"
                        type="email"
                        // oxlint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        autoComplete="email"
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={processing}
                        data-test="email-password-reset-link-button"
                    >
                        {t('Email password reset link')}
                    </Button>
                </Form.Item>

                <Flex justify="center">
                    <Link as={Typography.Link} href={login()}>
                        {t('Back to log in')}
                    </Link>
                </Flex>
            </Form>
        </>
    );
}

ForgotPassword.layout = { title: msg('Forgot password') };
