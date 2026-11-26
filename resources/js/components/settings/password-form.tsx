import { ProCard } from '@ant-design/pro-components';
import { Alert, Button, Col, Flex, Form, Input, Row } from 'antd';
import { t } from '@/lib/i18n';
import { update } from '@/routes/user-password';
import { useInertiaForm } from '@/ui/form';

/**
 * Changing the password. The server checks the new password and its
 * confirmation while the user types; whether the current password is right is
 * told when the form is sent. The fields are emptied once it is saved.
 */
export default function PasswordForm({
    passwordRules,
}: {
    passwordRules: string;
}) {
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        update(),
        { current_password: '', password: '', password_confirmation: '' },
        {
            resetOnSuccess: [
                'current_password',
                'password',
                'password_confirmation',
            ],
        },
    );

    return (
        <ProCard title={t('Update password')} headerBordered>
            <Row>
                <Col xs={24} md={16} xl={12}>
                    <Flex vertical gap="middle">
                        {unplacedErrors.length > 0 && (
                            <Alert
                                type="error"
                                showIcon
                                title={unplacedErrors.join(' ')}
                            />
                        )}
                        <Form {...formProps}>
                            <Form.Item
                                label={t('Current password')}
                                name="current_password"
                                required
                            >
                                <Input.Password
                                    name="current_password"
                                    autoComplete="current-password"
                                />
                            </Form.Item>

                            <Form.Item
                                label={t('New password')}
                                name="password"
                                required
                            >
                                <Input.Password
                                    name="password"
                                    autoComplete="new-password"
                                    passwordrules={passwordRules}
                                />
                            </Form.Item>

                            <Form.Item
                                label={t('Confirm password')}
                                name="password_confirmation"
                                required
                            >
                                <Input.Password
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    passwordrules={passwordRules}
                                />
                            </Form.Item>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={processing}
                                    data-test="update-password-button"
                                >
                                    {t('Save')}
                                </Button>
                            </Form.Item>
                        </Form>
                    </Flex>
                </Col>
            </Row>
        </ProCard>
    );
}
