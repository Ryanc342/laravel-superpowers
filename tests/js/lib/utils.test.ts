import { describe, expect, it } from 'vite-plus/test';
import { cn, toUrl } from '@/lib/utils';

describe('cn', () => {
    it('lets a later Tailwind class win over an earlier one of the same kind', () => {
        expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4');
    });

    it('drops false, null and undefined', () => {
        expect(cn('block', false, null, undefined, 'mt-2')).toBe('block mt-2');
    });
});

describe('toUrl', () => {
    it('returns a string href as it is', () => {
        expect(toUrl('/dashboard')).toBe('/dashboard');
    });

    it('takes the url of a Wayfinder route object', () => {
        expect(toUrl({ url: '/settings/profile', method: 'get' })).toBe(
            '/settings/profile',
        );
    });
});
