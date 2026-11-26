import { DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { router } from '@inertiajs/react';
import { usePasskeyRegister } from '@laravel/passkeys/react';
import {
    App,
    Button,
    Empty,
    Flex,
    Form,
    Input,
    Popconfirm,
    Table,
    Tag,
    Typography,
} from 'antd';
import { useState } from 'react';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import { t } from '@/lib/i18n';
import type { Passkey } from '@/types/auth';
import { ResponsiveModal } from '@/ui/dialog';

/** Ties the dialog's OK button to its form, which is rendered in the dialog. */
const FORM_ID = 'add-passkey-form';

/** A name for the passkey that says where it is: `Chrome on Mac`. Browser only. */
function suggestedName(): string {
    const agent = navigator.userAgent;
    const browser = [
        { pattern: /Edg|Edge/, name: 'Edge' },
        { pattern: /OPR|Opera|OPiOS/, name: 'Opera' },
        { pattern: /Firefox|FxiOS/, name: 'Firefox' },
        { pattern: /Chrome|CriOS/, name: 'Chrome' },
        { pattern: /Safari/, name: 'Safari' },
    ].find(({ pattern }) => pattern.test(agent))?.name;
    const system = [
        { pattern: /iPhone/, name: 'iPhone' },
        { pattern: /iPad|Macintosh(?=.*Mobile)/, name: 'iPad' },
        { pattern: /Android/, name: 'Android' },
        { pattern: /Mac/, name: 'Mac' },
        { pattern: /Windows/, name: 'Windows' },
    ].find(({ pattern }) => pattern.test(agent))?.name;

    if (browser && system) {
        return t(':browser on :system', { browser, system });
    }

    return browser ?? system ?? '';
}

/**
 * Removing a passkey cannot be undone, so it asks first. The request is the
 * popconfirm's own, which keeps its button busy until the server has answered.
 */
function RemovePasskey({ passkey }: { passkey: Passkey }) {
    return (
        <Popconfirm
            title={t('Remove the ":name" passkey?', { name: passkey.name })}
            description={t('You will no longer be able to use it to sign in.')}
            okText={t('Remove')}
            okButtonProps={{ danger: true }}
            onConfirm={() =>
                new Promise<void>((resolve) =>
                    router.visit(destroy(passkey.id), {
                        preserveScroll: true,
                        onFinish: () => resolve(),
                    }),
                )
            }
        >
            <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                aria-label={t('Remove :name', { name: passkey.name })}
                data-test="remove-passkey-button"
            />
        </Popconfirm>
    );
}

/**
 * Registers a passkey: the browser asks the authenticator, so the only error
 * is the prompt's (cancelled, timed out), which is a message.
 */
function AddPasskey() {
    const { message } = App.useApp();
    const [open, setOpen] = useState(false);
    const [defaultName, setDefaultName] = useState('');
    const [name, setName] = useState('');
    const { register, isLoading, isSupported } = usePasskeyRegister({
        onSuccess: () => {
            setOpen(false);
            router.reload();
        },
        onError: (error) => void message.error(error.message),
    });

    if (!isSupported) {
        return (
            <Typography.Text type="secondary">
                {t('Passkeys are not supported in this browser.')}
            </Typography.Text>
        );
    }

    return (
        <>
            <Button
                icon={<KeyOutlined />}
                onClick={() => {
                    const suggestion = suggestedName();

                    setDefaultName(suggestion);
                    setName(suggestion);
                    setOpen(true);
                }}
            >
                {t('Add passkey')}
            </Button>

            <ResponsiveModal
                open={open}
                title={t('Add passkey')}
                okText={t('Register passkey')}
                okButtonProps={{
                    htmlType: 'submit',
                    form: FORM_ID,
                    disabled: name.trim() === '',
                }}
                confirmLoading={isLoading}
                onCancel={() => setOpen(false)}
                destroyOnHidden
            >
                <Form
                    id={FORM_ID}
                    layout="vertical"
                    noValidate
                    initialValues={{ name: defaultName }}
                    onValuesChange={(_changed, values) => setName(values.name)}
                    onFinish={({ name: chosen }) => void register(chosen)}
                >
                    <Form.Item
                        label={t('Passkey name')}
                        name="name"
                        extra={t(
                            'A name helps you identify this passkey later, such as MacBook Pro or iPhone',
                        )}
                    >
                        <Input
                            name="name"
                            // A dialog that opens puts the user in its one field.
                            // oxlint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            autoComplete="off"
                        />
                    </Form.Item>
                </Form>
            </ResponsiveModal>
        </>
    );
}

/** The passkeys a user signs in with, and a way to add one. */
export default function Passkeys({ passkeys }: { passkeys: Passkey[] }) {
    return (
        <ProCard title={t('Passkeys')} extra={<AddPasskey />} headerBordered>
            <Table<Passkey>
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={passkeys}
                scroll={{ x: 'max-content' }}
                locale={{
                    emptyText: (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={t('No passkeys yet')}
                        />
                    ),
                }}
                columns={[
                    {
                        title: t('Passkey name'),
                        dataIndex: 'name',
                        render: (name: string, { authenticator }) => (
                            <Flex gap="small" align="center">
                                <KeyOutlined />
                                {name}
                                {authenticator && <Tag>{authenticator}</Tag>}
                            </Flex>
                        ),
                    },
                    { title: t('Added'), dataIndex: 'created_at_diff' },
                    {
                        title: t('Last used'),
                        dataIndex: 'last_used_at_diff',
                        render: (diff: string | null) => diff ?? t('Never'),
                    },
                    {
                        key: 'remove',
                        align: 'end',
                        render: (_, passkey) => (
                            <RemovePasskey passkey={passkey} />
                        ),
                    },
                ]}
            />
        </ProCard>
    );
}
