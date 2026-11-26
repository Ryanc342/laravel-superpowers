import { ProCard } from '@ant-design/pro-components';
import { Alert, Button, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { destroy } from '@/routes/profile';
import { ResponsiveModal } from '@/ui/dialog';
import { useInertiaForm } from '@/ui/form';

/** Ties the dialog's OK button to its form, which is rendered in the dialog. */
const FORM_ID = 'delete-account-form';

/**
 * Deleting the account is high-risk, so it takes a dialog that asks for the
 * password, not a popconfirm. The dialog is a form: the server checks the
 * password on submit (it is the one field, so there is nothing to check while
 * typing).
 */
export default function DeleteAccount() {
    const [open, setOpen] = useState(false);
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        destroy(),
        { password: '' },
        { precognitive: false },
    );

    return (
        <ProCard title={t('Delete account')} headerBordered>
            <Flex vertical align="flex-start" gap="middle">
                <Typography.Text>
                    {t('Delete your account and all of its resources')}
                </Typography.Text>
                <Button
                    danger
                    type="primary"
                    data-test="delete-user-button"
                    onClick={() => setOpen(true)}
                >
                    {t('Delete account')}
                </Button>
            </Flex>

            <ResponsiveModal
                open={open}
                title={t('Delete your account')}
                okText={t('Delete account')}
                okButtonProps={{
                    danger: true,
                    htmlType: 'submit',
                    form: FORM_ID,
                    'data-test': 'confirm-delete-user-button',
                }}
                confirmLoading={processing}
                onCancel={() => setOpen(false)}
                destroyOnHidden
            >
                <Flex vertical gap="middle">
                    <Alert
                        type="warning"
                        showIcon
                        title={t(
                            'Once your account is deleted, all of its resources and data will also be permanently deleted.',
                        )}
                    />
                    {unplacedErrors.length > 0 && (
                        <Alert
                            type="error"
                            showIcon
                            title={unplacedErrors.join(' ')}
                        />
                    )}
                    {/* The password goes with the field when the dialog closes. */}
                    <Form {...formProps} id={FORM_ID} preserve={false}>
                        <Form.Item
                            label={t('Password')}
                            name="password"
                            required
                        >
                            <Input.Password
                                name="password"
                                // A dialog that opens puts the user in its one field.
                                // oxlint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                autoComplete="current-password"
                            />
                        </Form.Item>
                    </Form>
                </Flex>
            </ResponsiveModal>
        </ProCard>
    );
}
