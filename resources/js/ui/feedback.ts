import { router } from '@inertiajs/react';
import { App } from 'antd';
import { useEffect } from 'react';
import { t } from '@/lib/i18n';

const MESSAGE_TYPES = ['success', 'error', 'info', 'warning'] as const;

type MessageType = (typeof MESSAGE_TYPES)[number];

/** What a flashed toast shows: antd's `message[type](content)`. */
export type FlashMessage = { type: MessageType; content: string };

/** The key the network notification is shown under: failures at once share it. */
const NETWORK_ERROR_KEY = 'network-error';

/**
 * The message for the flash data of a visit, or null when it carries none.
 * The server flashes `toast: { type, message }`, with the message already in
 * the user's language. A toast of any other shape is not shown.
 */
export function flashToMessage(flash: unknown): FlashMessage | null {
    if (typeof flash !== 'object' || flash === null || !('toast' in flash)) {
        return null;
    }

    const { toast } = flash;

    if (
        typeof toast !== 'object' ||
        toast === null ||
        !('type' in toast) ||
        !('message' in toast) ||
        typeof toast.message !== 'string' ||
        !MESSAGE_TYPES.includes(toast.type as MessageType)
    ) {
        return null;
    }

    return { type: toast.type as MessageType, content: toast.message };
}

/**
 * Shows the server's flashed toast as an antd message. It needs antd's `App`
 * above it, which is what makes the message follow the theme. Mount it once.
 */
export function useFlashFeedback(): void {
    const { message } = App.useApp();

    useEffect(() => {
        return router.on('flash', (event) => {
            const shown = flashToMessage(event.detail.flash);

            if (shown) {
                void message[shown.type](shown.content);
            }
        });
    }, [message]);
}

/**
 * Tells the user when a request could not reach the server (offline, server
 * down), on every page and for every form, as an antd notification. Several
 * failures at once share one. It needs antd's `App` above it. Mount it once.
 */
export function useNetworkErrorFeedback(): void {
    const { notification } = App.useApp();

    useEffect(() => {
        return router.on('networkError', () => {
            notification.error({
                key: NETWORK_ERROR_KEY,
                title: t('Network error'),
                description: t('Check your connection and try again'),
            });
        });
    }, [notification]);
}
