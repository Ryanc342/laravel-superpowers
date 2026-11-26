import {
    PageContainer,
    ProCard,
    ProDescriptions,
    ProFormSelect,
    ProFormText,
    StepsForm,
} from '@ant-design/pro-components';
import type { ProDescriptionsColumn } from '@ant-design/pro-components';
import { Head } from '@inertiajs/react';
import { Alert, Flex, Form } from 'antd';
import { msg, t } from '@/lib/i18n';
import { store } from '@/routes/examples/steps';
import { useInertiaStepsForm } from '@/ui/form';
import PageTitle from '@/ui/page-title';

/*
 * The step-by-step form example: a new supplier, in three steps. The server
 * checks each step's fields before the next step shows (Precognition, only
 * those fields), then the whole supplier when the last step sends it.
 *
 * `useInertiaStepsForm` wires the steps: spread its props onto `StepsForm`
 * and onto every step, and list each step's fields, `[]` for the summary. The
 * server asks whether the company is a supplier already on the send only, so
 * that error comes back after the last step, and the form goes back to the
 * company step to show it.
 */

type SupplierValues = {
    company_name: string;
    industry: string | null;
    website: string;
    contact_name: string;
    email: string;
    phone: string;
};

const NO_SUPPLIER: SupplierValues = {
    company_name: '',
    industry: null,
    website: '',
    contact_name: '',
    email: '',
    phone: '',
};

/** The fields (Laravel keys) of each step, which Next checks on the server. The summary has none. */
const STEP_FIELDS = [
    ['company_name', 'industry', 'website'],
    ['contact_name', 'email', 'phone'],
    [],
];

const industries: Record<string, string> = {
    manufacturing: msg('Manufacturing'),
    retail: msg('Retail'),
    logistics: msg('Logistics'),
    services: msg('Professional services'),
};

/** What the last step shows, to be checked before it is sent. */
function Summary({ supplier }: { supplier: SupplierValues }) {
    const fields: ProDescriptionsColumn<SupplierValues>[] = [
        { title: t('Company name'), dataIndex: 'company_name' },
        {
            title: t('Industry'),
            dataIndex: 'industry',
            render: () =>
                supplier.industry ? t(industries[supplier.industry]) : '-',
        },
        { title: t('Website'), dataIndex: 'website' },
        { title: t('Contact name'), dataIndex: 'contact_name' },
        { title: t('Email address'), dataIndex: 'email' },
        { title: t('Phone number'), dataIndex: 'phone' },
    ];

    return (
        <ProDescriptions<SupplierValues>
            dataSource={supplier}
            columns={fields}
            column={1}
        />
    );
}

export default function StepsExample() {
    const { stepsFormProps, stepFormProps, form, unplacedErrors } =
        useInertiaStepsForm<SupplierValues>(store(), NO_SUPPLIER, STEP_FIELDS);
    const supplier = Form.useWatch((values: SupplierValues) => values, {
        form,
        preserve: true,
    });
    const title = t('New supplier');

    return (
        <>
            <Head title={title} />

            <PageContainer
                title={<PageTitle>{title}</PageTitle>}
                breadcrumb={{ items: [{ title: t('Examples') }, { title }] }}
            >
                <ProCard>
                    <Flex vertical gap="middle">
                        {unplacedErrors.length > 0 && (
                            <Alert
                                type="error"
                                showIcon
                                title={unplacedErrors.join(' ')}
                            />
                        )}

                        <StepsForm<SupplierValues> {...stepsFormProps}>
                            <StepsForm.StepForm
                                name="company"
                                title={t('Company')}
                                {...stepFormProps}
                            >
                                <ProFormText
                                    name="company_name"
                                    label={t('Company name')}
                                    required
                                />
                                <ProFormSelect
                                    name="industry"
                                    label={t('Industry')}
                                    required
                                    options={Object.entries(industries).map(
                                        ([value, label]) => ({
                                            value,
                                            label: t(label),
                                        }),
                                    )}
                                />
                                <ProFormText
                                    name="website"
                                    label={t('Website')}
                                />
                            </StepsForm.StepForm>

                            <StepsForm.StepForm
                                name="contact"
                                title={t('Contact person')}
                                {...stepFormProps}
                            >
                                <ProFormText
                                    name="contact_name"
                                    label={t('Contact name')}
                                    required
                                />
                                <ProFormText
                                    name="email"
                                    label={t('Email address')}
                                    required
                                    fieldProps={{ type: 'email' }}
                                />
                                <ProFormText
                                    name="phone"
                                    label={t('Phone number')}
                                />
                            </StepsForm.StepForm>

                            <StepsForm.StepForm
                                name="confirm"
                                title={t('Confirm')}
                                {...stepFormProps}
                            >
                                {supplier && <Summary supplier={supplier} />}
                            </StepsForm.StepForm>
                        </StepsForm>
                    </Flex>
                </ProCard>
            </PageContainer>
        </>
    );
}
