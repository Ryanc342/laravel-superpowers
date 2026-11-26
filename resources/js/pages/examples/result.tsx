import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Head, Link } from '@inertiajs/react';
import { Button, Result } from 'antd';
import { msg, t } from '@/lib/i18n';
import { dashboard } from '@/routes';
import { create } from '@/routes/examples/steps';
import PageTitle from '@/ui/page-title';

/*
 * The result example: what the user sees after a form that does something
 * they wait for (here the step-by-step form), when it worked and when it did
 * not. The title says what happened, the line under it what it means, and the
 * buttons are what to do next: the main one first.
 */

type ResultStatus = 'success' | 'error';

const CONTENT: Record<ResultStatus, { title: string; description: string }> = {
    success: {
        title: msg('Supplier added'),
        description: msg('You can now place orders with this supplier.'),
    },
    error: {
        title: msg('Supplier not added'),
        description: msg('Nothing was saved. Check the details and try again.'),
    },
};

export default function ResultExample({ status }: { status: ResultStatus }) {
    const { title, description } = CONTENT[status];

    return (
        <>
            <Head title={t(title)} />

            <PageContainer
                breadcrumb={{
                    items: [{ title: t('Examples') }, { title: t(title) }],
                }}
            >
                <ProCard>
                    <Result
                        status={status}
                        title={<PageTitle>{t(title)}</PageTitle>}
                        subTitle={t(description)}
                        extra={[
                            <Link
                                key="next"
                                as={Button}
                                type="primary"
                                href={create.url()}
                            >
                                {status === 'success'
                                    ? t('Add another supplier')
                                    : t('Try again')}
                            </Link>,
                            <Link
                                key="dashboard"
                                as={Button}
                                href={dashboard.url()}
                            >
                                {t('Back to dashboard')}
                            </Link>,
                        ]}
                    />
                </ProCard>
            </PageContainer>
        </>
    );
}
