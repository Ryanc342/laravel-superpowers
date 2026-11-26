import { Head, setLayoutProps } from '@inertiajs/react';
import { Button, Flex, Form, Input } from 'antd';
import { useState } from 'react';
import FormAlerts from '@/components/auth/form-alerts';
import { msg, t } from '@/lib/i18n';
import { store } from '@/routes/two-factor/login';
import { useInertiaForm } from '@/ui/form';

/** The page's title and description for each way of confirming the sign-in. */
const CODE_LAYOUT = {
    title: msg('Authentication code'),
    description: msg('Enter the code from your authenticator app'),
};
const RECOVERY_LAYOUT = {
    title: msg('Recovery code'),
    description: msg('Enter one of your emergency recovery codes'),
};

export default function TwoFactorChallenge() {
    const [usesRecoveryCode, setUsesRecoveryCode] = useState(false);
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        store(),
        { code: '', recovery_code: '' },
        { precognitive: false },
    );

    // A visit starts with the code's title (`layout` below), which is also the
    // server render's. A switch is a click, not a render, so it can set them.
    const toggleRecoveryCode = (): void => {
        setLayoutProps(usesRecoveryCode ? CODE_LAYOUT : RECOVERY_LAYOUT);
        setUsesRecoveryCode(!usesRecoveryCode);
    };

    return (
        <>
            <Head title={t('Two-factor authentication')} />

            <FormAlerts errors={unplacedErrors} />

            {/* A field that leaves the form takes its value and error with it. */}
            <Form {...formProps} noValidate preserve={false}>
                {usesRecoveryCode ? (
                    <Form.Item
                        label={t('Recovery code')}
                        name="recovery_code"
                        required
                    >
                        <Input
                            name="recovery_code"
                            autoFocus
                            autoComplete="off"
                        />
                    </Form.Item>
                ) : (
                    <Form.Item name="code">
                        <Input.OTP
                            length={6}
                            autoFocus
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            aria-label={t('Authentication code')}
                            data-test="code"
                            formatter={(value) => value.replaceAll(/\D/g, '')}
                        />
                    </Form.Item>
                )}

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={processing}
                    >
                        {t('Continue')}
                    </Button>
                </Form.Item>

                <Flex justify="center">
                    <Button type="link" onClick={toggleRecoveryCode}>
                        {usesRecoveryCode
                            ? t('Use an authentication code')
                            : t('Use a recovery code')}
                    </Button>
                </Flex>
            </Form>
        </>
    );
}

TwoFactorChallenge.layout = CODE_LAYOUT;
