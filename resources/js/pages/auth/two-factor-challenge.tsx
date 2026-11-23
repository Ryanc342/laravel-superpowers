import { Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useMemo, useState } from 'react';
import FormField from '@/components/shared/form-field';
import StackedForm from '@/components/shared/stacked-form';
import SubmitButton from '@/components/shared/submit-button';
import TextField from '@/components/shared/text-field';
import { textLinkClassName } from '@/components/text-link';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const authConfigContent = useMemo<{
        title: string;
        description: string;
        toggleText: string;
    }>(() => {
        if (showRecoveryInput) {
            return {
                title: 'Recovery code',
                description:
                    'Please confirm access to your account by entering one of your emergency recovery codes.',
                toggleText: 'login using an authentication code',
            };
        }

        return {
            title: 'Authentication code',
            description:
                'Enter the authentication code provided by your authenticator application.',
            toggleText: 'login using a recovery code',
        };
    }, [showRecoveryInput]);

    setLayoutProps({
        title: authConfigContent.title,
        description: authConfigContent.description,
    });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title="Two-factor authentication" />

            <StackedForm
                {...store.form()}
                resetOnError
                resetOnSuccess={!showRecoveryInput}
                wideButtons
            >
                {({ errors, processing, clearErrors }) => (
                    <>
                        {showRecoveryInput ? (
                            <TextField
                                label="Recovery code"
                                name="recovery_code"
                                type="text"
                                autoFocus={showRecoveryInput}
                                required
                                error={errors.recovery_code}
                            />
                        ) : (
                            <FormField
                                label="Authentication code"
                                htmlFor="code"
                                error={errors.code}
                                hideLabel
                                className="justify-items-center"
                            >
                                <InputOTP
                                    id="code"
                                    name="code"
                                    maxLength={OTP_MAX_LENGTH}
                                    value={code}
                                    onChange={(value) => setCode(value)}
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
                        )}

                        <SubmitButton>Continue</SubmitButton>

                        <p className="text-center text-sm text-muted-foreground">
                            <span>or you can </span>
                            <button
                                type="button"
                                className={`cursor-pointer ${textLinkClassName}`}
                                onClick={() => toggleRecoveryMode(clearErrors)}
                            >
                                {authConfigContent.toggleText}
                            </button>
                        </p>
                    </>
                )}
            </StackedForm>
        </>
    );
}
