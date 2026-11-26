import { ProCard } from '@ant-design/pro-components';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Alert, Button, Col, Flex, Form, Input, Row } from 'antd';
import DeleteAccount from '@/components/settings/delete-account';
import { t } from '@/lib/i18n';
import { update } from '@/routes/profile';
import { send } from '@/routes/verification';
import { useInertiaForm } from '@/ui/form';

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { user } = usePage().props.auth;
    const resend = useForm({});
    const { formProps, processing, unplacedErrors } = useInertiaForm(update(), {
        name: user.name,
        email: user.email,
    });
    const isUnverified = mustVerifyEmail && user.email_verified_at === null;

    return (
        <>
            <Head title={t('Profile')} />

            <Flex vertical gap="middle">
                <ProCard title={t('Profile')} headerBordered>
                    <Row>
                        <Col xs={24} md={16} xl={12}>
                            <Flex vertical gap="middle">
                                {status === 'verification-link-sent' && (
                                    <Alert
                                        type="success"
                                        showIcon
                                        title={t(
                                            'A new verification link has been sent to your email address.',
                                        )}
                                    />
                                )}
                                {unplacedErrors.length > 0 && (
                                    <Alert
                                        type="error"
                                        showIcon
                                        title={unplacedErrors.join(' ')}
                                    />
                                )}
                                {isUnverified && (
                                    <Alert
                                        type="warning"
                                        showIcon
                                        title={t(
                                            'Your email address is unverified.',
                                        )}
                                        action={
                                            <Button
                                                type="link"
                                                loading={resend.processing}
                                                onClick={() =>
                                                    resend.submit(send(), {
                                                        preserveScroll: true,
                                                    })
                                                }
                                            >
                                                {t(
                                                    'Re-send verification email',
                                                )}
                                            </Button>
                                        }
                                    />
                                )}
                                <Form {...formProps}>
                                    <Form.Item
                                        label={t('Name')}
                                        name="name"
                                        required
                                    >
                                        <Input
                                            name="name"
                                            autoComplete="name"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label={t('Email address')}
                                        name="email"
                                        required
                                    >
                                        <Input
                                            name="email"
                                            type="email"
                                            autoComplete="username"
                                        />
                                    </Form.Item>

                                    <Form.Item>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={processing}
                                            data-test="update-profile-button"
                                        >
                                            {t('Save')}
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </Flex>
                        </Col>
                    </Row>
                </ProCard>

                <DeleteAccount />
            </Flex>
        </>
    );
}
