import type { Auth } from '@/types/auth';
import type { SharedMenuItem } from '@/types/navigation';

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
            // The menu's group of page-type examples, in local and testing only: null elsewhere.
            examples: SharedMenuItem[] | null;
            sidebarOpen: boolean;
            perPageOptions: number[];
            [key: string]: unknown;
        };
    }
}
