import {
    PageContainer,
    ProCard,
    ProDescriptions,
    ProFormSelect,
    ProFormText,
    StepsForm,
} from '@ant-design/pro-components';
import type { ProDescriptionsItemProps } from '@ant-design/pro-components';
import { Head } from '@inertiajs/react';
import { Alert, Flex, Form } from 'antd';
import { useState } from 'react';
import { msg, t } from '@/lib/i18n';
import { store } from '@/routes/examples/steps';
import { useInertiaForm } from '@/ui/form';
import PageTitle from '@/ui/page-title';

/*
 * The step-by-step form example: a new supplier, in three steps. The server
 * checks each step's fields before the next step shows (Precognition, only
 * those fields), then the whole supplier when the last step sends it.
 *
 * The steps are one form: one `useInertiaForm`, whose antd form every step
 * is given, so the last step sends what all of them hold, and the server's
 * errors find their fields in any step. But Pro's StepsForm makes each step
 * an antd `Form` of its own, and when forms share an instance, whichever of
 * them rendered last decides what a submit runs, whatever step it is in.
 * Two rules follow:
 *
 * - every step's `onFinish` is the same function, `finishShownStep`, which
 *   asks which step shows (`current`), not which step it belongs to;
 * - the glue gets the form's own values (`valuesOfEveryStep`), not the values
 *   of the step whose `Form` ran: Pro formats a date only in its own step. A
 *   date goes out as its local calendar date, or in the format `dateFormats`
 *   names for it.
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

/** The fields (Laravel keys) of each step but the last, which the server checks before the next one. */
const STEP_FIELDS = [
    ['company_name', 'industry', 'website'],
    ['contact_name', 'email', 'phone'],
];

const industries: Record<string, string> = {
    manufacturing: msg('Manufacturing'),
    retail: msg('Retail'),
    logistics: msg('Logistics'),
    services: msg('Professional services'),
};

/** What the last step shows, to be checked before it is sent. */
function Summary({ supplier }: { supplier: SupplierValues }) {
    const fields: ProDescriptionsItemProps<SupplierValues>[] = [
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
    const [current, setCurrent] = useState(0);
    const { formProps, validateFields, unplacedErrors } =
        useInertiaForm<SupplierValues>(store(), NO_SUPPLIER);
    const { form, onValuesChange, onFinish, ...stepFormProps } = formProps;
    const supplier = Form.useWatch((values: SupplierValues) => values, {
        form,
        preserve: true,
    });
    const title = t('New supplier');

    const valuesOfEveryStep = (): SupplierValues =>
        form.getFieldsValue(true) as SupplierValues;

    /**
     * What each step's Next runs: the check of the fields of the step that
     * shows, which moves on when it resolves `true`. On the last step, it
     * sends the supplier.
     */
    const finishShownStep = (): Promise<boolean> =>
        current < STEP_FIELDS.length
            ? validateFields(STEP_FIELDS[current])
            : onFinish(valuesOfEveryStep());

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

                        <StepsForm<SupplierValues>
                            current={current}
                            onCurrentChange={setCurrent}
                            formProps={{
                                ...stepFormProps,
                                form,
                                onValuesChange: (changedValues) =>
                                    onValuesChange(
                                        changedValues,
                                        valuesOfEveryStep(),
                                    ),
                            }}
                        >
                            <StepsForm.StepForm
                                name="company"
                                title={t('Company')}
                                onFinish={finishShownStep}
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
                                onFinish={finishShownStep}
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
                                onFinish={finishShownStep}
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
