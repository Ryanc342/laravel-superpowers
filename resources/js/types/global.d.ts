import type { Auth } from '@/types/auth';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            locale: string;
            locales: { value: string; label: string }[];
            // English has no sentences, and PHP sends its empty table as `[]`, not `{}`.
            translations: Record<string, string> | [];
            // Which of Fortify's features config/fortify.php has on.
            features: {
                registration: boolean;
                resetPasswords: boolean;
                emailVerification: boolean;
                twoFactorAuthentication: boolean;
                passkeys: boolean;
            };
            // Whether the page-type examples exist (local and testing only), for the menu.
            examples: boolean;
            sidebarOpen: boolean;
            perPageOptions: number[];
            [key: string]: unknown;
        };
    }
}
