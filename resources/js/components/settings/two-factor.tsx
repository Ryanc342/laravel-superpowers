import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { router, useForm } from '@inertiajs/react';
import {
    Alert,
    Button,
    Divider,
    Flex,
    Form,
    Input,
    Popconfirm,
    Spin,
    Typography,
} from 'antd';
import { Fragment, useEffect, useRef, useState } from 'react';
import { OTP_MAX_LENGTH, useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import type { UseTwoFactorAuthReturn } from '@/hooks/use-two-factor-auth';
import { t } from '@/lib/i18n';
import {
    confirm,
    disable,
    enable,
    regenerateRecoveryCodes,
} from '@/routes/two-factor';
import { ResponsiveModal } from '@/ui/dialog';
import { useInertiaForm } from '@/ui/form';

/** Sends a request and settles when the server has answered, which keeps a popconfirm's button busy. */
function sendRequest(
    route: Parameters<typeof router.visit>[0],
    onSuccess?: () => void,
): Promise<void> {
    return new Promise((resolve) =>
        router.visit(route, {
            preserveScroll: true,
            // `visit` starts the page over unless told otherwise, which would
            // drop what the page holds (the codes it fetched, whether they
            // are shown) before `onSuccess` could use it.
            preserveState: true,
            onSuccess,
            onFinish: () => resolve(),
        }),
    );
}

/**
 * The errors of the hook that fetches the setup data and the codes. They are
 * English sentences marked with `msg()`, translated here.
 */
function FetchErrors({ errors }: { errors: string[] }) {
    return (
        <Alert
            type="error"
            showIcon
            title={errors.map((error) => t(error)).join(' ')}
        />
    );
}

type SetupDialogProps = {
    open: boolean;
    onClose: () => void;
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
    twoFactor: UseTwoFactorAuthReturn;
};

/**
 * The dialog that finishes turning two-factor authentication on: the QR code
 * and the setup key for the authenticator app, then, when the app asks for
 * it, a code from the app to confirm.
 */
function SetupDialog({
    open,
    onClose,
    requiresConfirmation,
    twoFactorEnabled,
    twoFactor,
}: SetupDialogProps) {
    const {
        qrCodeSvg,
        manualSetupKey,
        errors,
        clearSetupData,
        fetchSetupData,
    } = twoFactor;
    const [isVerifying, setIsVerifying] = useState(false);
    const close = (): void => {
        if (twoFactorEnabled) {
            clearSetupData();
        }

        setIsVerifying(false);
        onClose();
    };
    // Fortify puts the confirmation's errors in a bag of their own.
    const { formProps, processing, unplacedErrors } = useInertiaForm(
        confirm(),
        { code: '' },
        {
            precognitive: false,
            errorBag: 'confirmTwoFactorAuthentication',
            resetOnSuccess: ['code'],
            onSuccess: () => {
                clearSetupData();
                setIsVerifying(false);
                onClose();
            },
        },
    );
    const fetchSetupDataOnOpen = useRef(fetchSetupData);

    useEffect(() => {
        fetchSetupDataOnOpen.current = fetchSetupData;
    }, [fetchSetupData]);

    useEffect(() => {
        if (open && !qrCodeSvg) {
            void fetchSetupDataOnOpen.current();
        }
    }, [open, qrCodeSvg]);

    // Without a confirmation, the setup is done, and all that is left is to close.
    if (twoFactorEnabled && !requiresConfirmation) {
        return (
            <ResponsiveModal
                open={open}
                title={t('Two-factor authentication enabled')}
                onCancel={close}
                footer={
                    <Flex justify="flex-end">
                        <Button type="primary" onClick={close}>
                            {t('Close')}
                        </Button>
                    </Flex>
                }
                destroyOnHidden
            >
                <SetupKey
                    qrCodeSvg={qrCodeSvg}
                    manualSetupKey={manualSetupKey}
                    errors={errors}
                />
            </ResponsiveModal>
        );
    }

    if (isVerifying) {
        return (
            <ResponsiveModal
                open={open}
                title={t('Verify authentication code')}
                okText={t('Confirm')}
                // The button is "Continue" on the step before, and the same
                // element: a submit button here would submit on that click.
                onOk={() => formProps.form.submit()}
                cancelText={t('Back')}
                cancelButtonProps={{
                    onClick: () => setIsVerifying(false),
                    disabled: processing,
                }}
                confirmLoading={processing}
                onCancel={close}
                destroyOnHidden
            >
                <Flex vertical gap="middle">
                    {unplacedErrors.length > 0 && (
                        <Alert
                            type="error"
                            showIcon
                            title={unplacedErrors.join(' ')}
                        />
                    )}
                    <Form {...formProps} preserve={false}>
                        <Form.Item name="code">
                            <Input.OTP
                                length={OTP_MAX_LENGTH}
                                // A dialog that opens puts the user in its one field.
                                // oxlint-disable-next-line jsx-a11y/no-autofocus
                                autoFocus
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                aria-label={t('Authentication code')}
                                data-test="code"
                                formatter={(value) =>
                                    value.replaceAll(/\D/g, '')
                                }
                            />
                        </Form.Item>
                        {/* Enter in the code sends it: a form of several fields
                            sends on Enter only through a submit button of its
                            own. Hidden, it is in no one's way, and needs no label. */}
                        {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label */}
                        <button type="submit" hidden />
                    </Form>
                </Flex>
            </ResponsiveModal>
        );
    }

    return (
        <ResponsiveModal
            open={open}
            title={t('Enable two-factor authentication')}
            okText={t('Continue')}
            onOk={() => setIsVerifying(true)}
            onCancel={close}
            destroyOnHidden
        >
            <SetupKey
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                errors={errors}
            />
        </ResponsiveModal>
    );
}

/**
 * What an authenticator app takes in: the QR code, and the key to type in
 * where scanning is not possible. The QR code is the server's SVG.
 */
function SetupKey({
    qrCodeSvg,
    manualSetupKey,
    errors,
}: {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    errors: string[];
}) {
    if (errors.length > 0) {
        return <FetchErrors errors={errors} />;
    }

    return (
        <Flex vertical align="center" gap="small">
            <Typography.Text>
                {t('Scan the QR code with your authenticator app')}
            </Typography.Text>
            {qrCodeSvg ? (
                <div dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
            ) : (
                <Spin />
            )}
            <Divider plain>{t('Or enter the setup key by hand')}</Divider>
            {manualSetupKey ? (
                <Typography.Text code copyable>
                    {manualSetupKey}
                </Typography.Text>
            ) : (
                <Spin />
            )}
        </Flex>
    );
}

/**
 * The recovery codes of a user who has two-factor authentication on: hidden
 * until asked for, and regenerated (the old ones stop working) after a
 * confirmation.
 */
function RecoveryCodes({ twoFactor }: { twoFactor: UseTwoFactorAuthReturn }) {
    const { recoveryCodesList, fetchRecoveryCodes, errors } = twoFactor;
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const toggle = async (): Promise<void> => {
        if (!isVisible && recoveryCodesList.length === 0) {
            setIsLoading(true);
            await fetchRecoveryCodes();
            setIsLoading(false);
        }

        setIsVisible(!isVisible);
    };

    return (
        <ProCard type="inner" title={t('2FA recovery codes')}>
            <Flex vertical gap="middle">
                <Typography.Text>
                    {t(
                        'Recovery codes let you sign in if you lose your 2FA device.',
                    )}
                </Typography.Text>
                <Flex gap="small" wrap>
                    <Button
                        icon={
                            isVisible ? (
                                <EyeInvisibleOutlined />
                            ) : (
                                <EyeOutlined />
                            )
                        }
                        loading={isLoading}
                        onClick={() => void toggle()}
                    >
                        {isVisible
                            ? t('Hide recovery codes')
                            : t('View recovery codes')}
                    </Button>
                    {isVisible && recoveryCodesList.length > 0 && (
                        <Popconfirm
                            title={t('Regenerate recovery codes?')}
                            description={t(
                                'Your current recovery codes stop working at once. Store the new ones before you close this page.',
                            )}
                            okText={t('Regenerate')}
                            onConfirm={() =>
                                sendRequest(
                                    regenerateRecoveryCodes(),
                                    () => void fetchRecoveryCodes(),
                                )
                            }
                        >
                            <Button>{t('Regenerate codes')}</Button>
                        </Popconfirm>
                    )}
                </Flex>
                {isVisible &&
                    (errors.length > 0 ? (
                        <FetchErrors errors={errors} />
                    ) : (
                        <Typography.Paragraph
                            copyable={{ text: recoveryCodesList.join('\n') }}
                        >
                            {recoveryCodesList.map((code, index) => (
                                <Fragment key={code}>
                                    {index > 0 && <br />}
                                    <Typography.Text code>
                                        {code}
                                    </Typography.Text>
                                </Fragment>
                            ))}
                        </Typography.Paragraph>
                    ))}
                {isVisible && (
                    <Typography.Text type="secondary">
                        {t(
                            'Each recovery code can be used once to access your account and will be removed after use.',
                        )}
                    </Typography.Text>
                )}
            </Flex>
        </ProCard>
    );
}

type Props = {
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
};

/**
 * Turning two-factor authentication on and off, and its recovery codes. The
 * page leaves the section out when the feature is off.
 */
export default function TwoFactor({
    requiresConfirmation,
    twoFactorEnabled,
}: Props) {
    const twoFactor = useTwoFactorAuth();
    const { hasSetupData, clearTwoFactorAuthData } = twoFactor;
    const enableRequest = useForm({});
    const [isSetupOpen, setIsSetupOpen] = useState(false);
    const wasEnabled = useRef(twoFactorEnabled);

    // What was fetched for the setup and the codes goes when two-factor authentication is turned off.
    useEffect(() => {
        if (wasEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        wasEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    return (
        <ProCard title={t('Two-factor authentication')} headerBordered>
            <Flex vertical gap="middle">
                <Typography.Text>
                    {twoFactorEnabled
                        ? t(
                              'You will be asked for a code from your authenticator app when you sign in.',
                          )
                        : t(
                              'Ask for a code from your authenticator app when you sign in.',
                          )}
                </Typography.Text>

                <Flex>
                    {twoFactorEnabled ? (
                        <Popconfirm
                            title={t('Disable two-factor authentication?')}
                            description={t(
                                'You will sign in with your password only, and your recovery codes will stop working.',
                            )}
                            okText={t('Disable')}
                            okButtonProps={{ danger: true }}
                            onConfirm={() => sendRequest(disable())}
                        >
                            <Button danger>{t('Disable 2FA')}</Button>
                        </Popconfirm>
                    ) : hasSetupData ? (
                        <Button
                            type="primary"
                            onClick={() => setIsSetupOpen(true)}
                        >
                            {t('Continue setup')}
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            loading={enableRequest.processing}
                            onClick={() =>
                                enableRequest.submit(enable(), {
                                    preserveScroll: true,
                                    onSuccess: () => setIsSetupOpen(true),
                                })
                            }
                        >
                            {t('Enable 2FA')}
                        </Button>
                    )}
                </Flex>

                {twoFactorEnabled && <RecoveryCodes twoFactor={twoFactor} />}
            </Flex>

            <SetupDialog
                open={isSetupOpen}
                onClose={() => setIsSetupOpen(false)}
                requiresConfirmation={requiresConfirmation}
                twoFactorEnabled={twoFactorEnabled}
                twoFactor={twoFactor}
            />
        </ProCard>
    );
}
