import { KeyOutlined } from '@ant-design/icons';
import { router } from '@inertiajs/react';
import { usePasskeyVerify } from '@laravel/passkeys/react';
import { App, Button, Divider } from 'antd';
import { t } from '@/lib/i18n';
import { dashboard } from '@/routes';

type Props = {
    /**
     * The routes of another passkey flow, such as confirming the password:
     * Wayfinder's, of which only the URL is used.
     */
    routes?: {
        options: { url: string };
        submit: { url: string };
    };
    label?: string;
    loadingLabel?: string;
    /** What the divider between the button and the password form says. */
    separator?: string;
};

/**
 * Signs in (or confirms the password) with a passkey, above the password
 * form. The browser may not support passkeys, and then nothing shows. The page
 * leaves it out when `features.passkeys` is off. A failed prompt (cancelled,
 * timed out) is a message, not an error under a field.
 */
export default function PasskeySignIn({
    routes,
    label,
    loadingLabel,
    separator,
}: Props = {}) {
    const { message } = App.useApp();
    const { verify, isLoading, isSupported } = usePasskeyVerify({
        ...(routes && {
            routes: {
                options: routes.options.url,
                submit: routes.submit.url,
            },
        }),
        onSuccess: (response) => {
            router.visit(response.redirect ?? dashboard());
        },
        onError: (error) => {
            void message.error(error.message);
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <>
            <Button
                icon={<KeyOutlined />}
                loading={isLoading}
                onClick={() => void verify()}
            >
                {isLoading
                    ? (loadingLabel ?? t('Authenticating...'))
                    : (label ?? t('Sign in with a passkey'))}
            </Button>
            <Divider plain>{separator ?? t('Or continue with email')}</Divider>
        </>
    );
}
