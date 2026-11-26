import { GlobalOutlined } from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import { Button, Dropdown } from 'antd';
import { t } from '@/lib/i18n';
import { update } from '@/routes/locale';

/**
 * The language choice, from the page's `locales`. The server saves it (the
 * `locale` cookie, and the user's own setting when signed in) and sends the
 * page back in the new language, at the same scroll position.
 */
export default function LanguageSwitch() {
    const { locale, locales } = usePage().props;
    const currentLabel = locales.find(({ value }) => value === locale)?.label;

    return (
        <Dropdown
            trigger={['click']}
            menu={{
                items: locales.map(({ value, label }) => ({
                    key: value,
                    label,
                })),
                selectable: true,
                selectedKeys: [locale],
                onClick: ({ key }) => {
                    if (key !== locale) {
                        router.visit(update(), {
                            data: { locale: key },
                            preserveScroll: true,
                        });
                    }
                },
            }}
        >
            <Button
                type="text"
                icon={<GlobalOutlined />}
                aria-label={t('Language: :language', {
                    language: currentLabel ?? locale,
                })}
                data-test="language-switch"
            >
                {currentLabel}
            </Button>
        </Dropdown>
    );
}
