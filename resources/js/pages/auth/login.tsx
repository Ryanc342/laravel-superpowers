import { Head, Link, usePage } from '@inertiajs/react';
import { Button, Checkbox, Flex, Form, Input, Typography } from 'antd';
import FormAlerts from '@/components/auth/form-alerts';
import PasskeySignIn from '@/components/auth/passkey-sign-in';
import { msg, t } from '@/lib/i18n';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';
import { useInertiaForm } from '@/ui/form';

export default function Login({ status }: { status?: string }) {
    const { features } = usePage().props;
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        store(),
        { email: '', password: '', remember: false },
        { precognitive: false, resetOnSuccess: ['password'] },
    );

    return (
        <>
            <Head title={t('Log in')} />

            {features.passkeys && <PasskeySignIn />}

            <FormAlerts status={status} errors={unplacedErrors} />

            <Form {...formProps}>
                <Form.Item label={t('Email address')} name="email" required>
                    <Input
                        name="email"
                        type="email"
                        autoFocus
                        autoComplete="email"
                    />
                </Form.Item>

                <Form.Item label={t('Password')} name="password" required>
                    <Input.Password
                        name="password"
                        autoComplete="current-password"
                    />
                </Form.Item>

                <Form.Item>
                    <Flex justify="space-between" gap="small">
                        <Form.Item
                            name="remember"
                            valuePropName="checked"
                            noStyle
                        >
                            <Checkbox>{t('Remember me')}</Checkbox>
                        </Form.Item>
                        {features.resetPasswords && (
                            <Link as={Typography.Link} href={request()}>
                                {t('Forgot password?')}
                            </Link>
                        )}
                    </Flex>
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={processing}
                        data-test="login-button"
                    >
                        {t('Log in')}
                    </Button>
                </Form.Item>

                {features.registration && (
                    <Flex justify="center" gap="small">
                        <Typography.Text type="secondary">
                            {t("Don't have an account?")}
                        </Typography.Text>
                        <Link as={Typography.Link} href={register()}>
                            {t('Sign up')}
                        </Link>
                    </Flex>
                )}
            </Form>
        </>
    );
}

Login.layout = { title: msg('Log in to your account') };
