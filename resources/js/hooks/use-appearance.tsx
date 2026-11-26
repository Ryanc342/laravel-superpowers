import { useAppearance as useAppearanceSetting } from '@/ui/appearance';
import type { Appearance, ResolvedAppearance } from '@/ui/appearance';

export type { Appearance, ResolvedAppearance };

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

/**
 * The appearance setting under the names the pages that are not yet rebuilt
 * with antd use. The setting itself, its cookie and `html.dark` are
 * `@/ui/appearance`'s, so the old pages and antd's theme never disagree.
 */
export function useAppearance(): UseAppearanceReturn {
    const { appearance, resolved, setAppearance } = useAppearanceSetting();

    return {
        appearance,
        resolvedAppearance: resolved,
        updateAppearance: setAppearance,
    } as const;
}
