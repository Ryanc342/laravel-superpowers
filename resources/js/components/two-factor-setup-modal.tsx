import { Form } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Check, Copy, ScanLine } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import FormField from '@/components/shared/form-field';
import IconButton from '@/components/shared/icon-button';
import LabeledDivider from '@/components/shared/labeled-divider';
import ResponsiveDialog, {
    ResponsiveDialogBody,
    ResponsiveDialogFooter,
} from '@/components/shared/responsive-dialog';
import SubmitButton from '@/components/shared/submit-button';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { useAppearance } from '@/hooks/use-appearance';
import { useClipboard } from '@/hooks/use-clipboard';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { confirm } from '@/routes/two-factor';

function GridScanIcon() {
    return (
        <div className="mb-3 rounded-full border border-border bg-card p-0.5 shadow-sm">
            <div className="relative overflow-hidden rounded-full border border-border bg-muted p-2.5">
                <div className="absolute inset-0 grid grid-cols-5 opacity-50">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div
                            key={`col-${i + 1}`}
                            className="border-r border-border last:border-r-0"
                        />
                    ))}
                </div>
                <div className="absolute inset-0 grid grid-rows-5 opacity-50">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div
                            key={`row-${i + 1}`}
                            className="border-b border-border last:border-b-0"
                        />
                    ))}
                </div>
                <ScanLine className="relative z-20 size-6 text-foreground" />
            </div>
        </div>
    );
}

function TwoFactorSetupStep({
    qrCodeSvg,
    manualSetupKey,
    buttonText,
    onNextStep,
    errors,
}: {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    buttonText: string;
    onNextStep: () => void;
    errors: string[];
}) {
    const { resolvedAppearance } = useAppearance();
    const [copiedText, copy] = useClipboard();
    const copied = copiedText === manualSetupKey;

    if (errors?.length) {
        return (
            <ResponsiveDialogBody>
                <AlertError errors={errors} />
            </ResponsiveDialogBody>
        );
    }

    return (
        <ResponsiveDialogBody className="items-center">
            <div className="aspect-square w-64 rounded-lg border border-border p-5">
                {qrCodeSvg ? (
                    <div
                        className="aspect-square w-full rounded-lg bg-qr-background p-2 [&_svg]:size-full"
                        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                        style={{
                            filter:
                                resolvedAppearance === 'dark'
                                    ? 'invert(1) brightness(1.5)'
                                    : undefined,
                        }}
                    />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <Spinner />
                    </div>
                )}
            </div>

            <Button className="w-full" onClick={onNextStep}>
                {buttonText}
            </Button>

            <LabeledDivider>or, enter the code manually</LabeledDivider>

            <div className="flex w-full items-stretch overflow-hidden rounded-xl border border-border">
                {manualSetupKey ? (
                    <>
                        <input
                            type="text"
                            readOnly
                            aria-label="Setup key"
                            value={manualSetupKey}
                            className="w-full min-w-0 bg-background p-3 text-foreground outline-none"
                        />
                        <IconButton
                            label={copied ? 'Copied' : 'Copy setup key'}
                            className="h-auto rounded-none border-l border-border"
                            onClick={() => copy(manualSetupKey)}
                        >
                            {copied ? <Check /> : <Copy />}
                        </IconButton>
                    </>
                ) : (
                    <div className="flex w-full items-center justify-center bg-muted p-3">
                        <Spinner />
                    </div>
                )}
            </div>
        </ResponsiveDialogBody>
    );
}

function TwoFactorVerificationStep({
    onClose,
    onBack,
}: {
    onClose: () => void;
    onBack: () => void;
}) {
    const [code, setCode] = useState<string>('');

    return (
        <Form
            noValidate
            {...confirm.form()}
            onSuccess={() => onClose()}
            resetOnError
            resetOnSuccess
            className="flex min-h-0 flex-1 flex-col gap-6"
        >
            {({
                processing,
                errors,
            }: {
                processing: boolean;
                errors?: { confirmTwoFactorAuthentication?: { code?: string } };
            }) => (
                <>
                    <ResponsiveDialogBody>
                        <FormField
                            label="Authentication code"
                            htmlFor="otp"
                            error={errors?.confirmTwoFactorAuthentication?.code}
                            hideLabel
                            className="justify-items-center py-2"
                        >
                            <InputOTP
                                id="otp"
                                name="code"
                                value={code}
                                maxLength={OTP_MAX_LENGTH}
                                onChange={setCode}
                                disabled={processing}
                                pattern={REGEXP_ONLY_DIGITS}
                                autoFocus
                            >
                                <InputOTPGroup>
                                    {Array.from(
                                        { length: OTP_MAX_LENGTH },
                                        (_, index) => (
                                            <InputOTPSlot
                                                key={index}
                                                index={index}
                                            />
                                        ),
                                    )}
                                </InputOTPGroup>
                            </InputOTP>
                        </FormField>
                    </ResponsiveDialogBody>

                    <ResponsiveDialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onBack}
                            disabled={processing}
                        >
                            Back
                        </Button>
                        <SubmitButton disabled={code.length < OTP_MAX_LENGTH}>
                            Confirm
                        </SubmitButton>
                    </ResponsiveDialogFooter>
                </>
            )}
        </Form>
    );
}

type Props = {
    isOpen: boolean;
    onClose: () => void;
    requiresConfirmation: boolean;
    twoFactorEnabled: boolean;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    clearSetupData: () => void;
    fetchSetupData: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorSetupModal({
    isOpen,
    onClose,
    requiresConfirmation,
    twoFactorEnabled,
    qrCodeSvg,
    manualSetupKey,
    clearSetupData,
    fetchSetupData,
    errors,
}: Props) {
    const [showVerificationStep, setShowVerificationStep] =
        useState<boolean>(false);

    const modalConfig = useMemo<{
        title: string;
        description: string;
        buttonText: string;
    }>(() => {
        if (twoFactorEnabled) {
            return {
                title: 'Two-factor authentication enabled',
                description:
                    'Two-factor authentication is now enabled. Scan the QR code or enter the setup key in your authenticator app.',
                buttonText: 'Close',
            };
        }

        if (showVerificationStep) {
            return {
                title: 'Verify authentication code',
                description:
                    'Enter the 6-digit code from your authenticator app',
                buttonText: 'Continue',
            };
        }

        return {
            title: 'Enable two-factor authentication',
            description:
                'To finish enabling two-factor authentication, scan the QR code or enter the setup key in your authenticator app',
            buttonText: 'Continue',
        };
    }, [twoFactorEnabled, showVerificationStep]);

    const resetModalState = useCallback(() => {
        if (twoFactorEnabled) {
            clearSetupData();
        }

        setShowVerificationStep(false);
    }, [clearSetupData, twoFactorEnabled]);

    const handleClose = useCallback(() => {
        resetModalState();
        onClose();
    }, [onClose, resetModalState]);

    const handleModalNextStep = useCallback(() => {
        if (requiresConfirmation) {
            setShowVerificationStep(true);

            return;
        }

        clearSetupData();
        handleClose();
    }, [requiresConfirmation, clearSetupData, handleClose]);

    const fetchSetupDataRef = useRef(fetchSetupData);

    useEffect(() => {
        fetchSetupDataRef.current = fetchSetupData;
    }, [fetchSetupData]);

    useEffect(() => {
        if (isOpen && !qrCodeSvg) {
            void fetchSetupDataRef.current();
        }
    }, [isOpen, qrCodeSvg]);

    return (
        <ResponsiveDialog
            open={isOpen}
            onOpenChange={(open) => !open && handleClose()}
            title={modalConfig.title}
            instruction={modalConfig.description}
            icon={<GridScanIcon />}
            narrow
        >
            {showVerificationStep ? (
                <TwoFactorVerificationStep
                    onClose={handleClose}
                    onBack={() => setShowVerificationStep(false)}
                />
            ) : (
                <TwoFactorSetupStep
                    qrCodeSvg={qrCodeSvg}
                    manualSetupKey={manualSetupKey}
                    buttonText={modalConfig.buttonText}
                    onNextStep={handleModalNextStep}
                    errors={errors}
                />
            )}
        </ResponsiveDialog>
    );
}
