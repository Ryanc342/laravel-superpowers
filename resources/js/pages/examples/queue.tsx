import {
    PageContainer,
    ProFormSelect,
    ProTable,
} from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Head, router } from '@inertiajs/react';
import { Alert, Button, Empty, Flex, Popconfirm, Tag, Typography } from 'antd';
import { useState } from 'react';
import type { Key } from 'react';
import { msg, t, tChoice } from '@/lib/i18n';
import { update } from '@/routes/examples/queue';
import { ResponsiveModalForm } from '@/ui/dialog';
import { useInertiaForm } from '@/ui/form';
import { sortOrderOf, useInertiaTable } from '@/ui/list';
import type { ListProps } from '@/ui/list';
import PageTitle from '@/ui/page-title';

/*
 * The work queue example: the tasks of one status at a time, in tabs that
 * count them, and batch changes of the rows the user selects. Marking tasks
 * as completed cannot be undone, so a Popconfirm asks first; reassigning
 * opens a dialog with the one field it needs. The tab is a filter of the
 * list (`filter[status]`), so it lives in the URL with the search, the sort
 * and the page.
 */

type TaskStatus = 'todo' | 'in_progress' | 'completed';

type TaskPriority = 'low' | 'medium' | 'high';

type TaskRow = {
    id: number;
    title: string;
    customer: string;
    assignee: string;
    priority: TaskPriority;
    status: TaskStatus;
    created_on: string;
};

/** The list, with the tab it shows and each tab's count for the same search. */
type TaskList = ListProps<TaskRow> & {
    status: TaskStatus;
    counts: Record<TaskStatus, number>;
};

const taskStatuses: Record<TaskStatus, string> = {
    todo: msg('To do'),
    in_progress: msg('In progress'),
    completed: msg('Completed'),
};

const taskPriorities: Record<
    TaskPriority,
    { label: string; color: 'default' | 'warning' | 'error' }
> = {
    low: { label: msg('Low'), color: 'default' },
    medium: { label: msg('Medium'), color: 'warning' },
    high: { label: msg('High'), color: 'error' },
};

/**
 * Marks the tasks as completed, for a `Popconfirm`'s `onConfirm`: its OK
 * button spins until the server has answered. The server goes back to the
 * queue as it was, where the tasks are on the Completed tab.
 */
function completeTasks(ids: Key[], onCompleted: () => void): Promise<void> {
    return new Promise((resolve) => {
        router.patch(
            update(),
            { ids, action: 'complete' },
            {
                preserveScroll: true,
                onSuccess: onCompleted,
                onFinish: () => resolve(),
            },
        );
    });
}

type ReassignValues = {
    ids: Key[];
    action: 'reassign';
    assignee: string | null;
};

/**
 * Assigns the selected tasks to someone else, in a dialog (a sheet on a
 * phone). The tasks are values of the form with no field of their own; the
 * page mounts a new dialog for each selection (`key`), so the form starts
 * from the tasks selected now.
 */
function ReassignDialog({
    ids,
    assignees,
    onReassigned,
}: {
    ids: Key[];
    assignees: string[];
    onReassigned: () => void;
}) {
    const { formProps, unplacedErrors } = useInertiaForm<ReassignValues>(
        update(),
        { ids, action: 'reassign', assignee: null },
        // Its fields' ids start `reassign_`; the search form's start `tasks_search_`.
        { name: 'reassign', onSuccess: onReassigned },
    );

    return (
        <ResponsiveModalForm<ReassignValues>
            {...formProps}
            title={tChoice(
                'Reassign :count task|Reassign :count tasks',
                ids.length,
            )}
            width={480}
            trigger={
                <Button size="small" data-test="reassign-tasks-button">
                    {t('Reassign')}
                </Button>
            }
            modalProps={{ okText: t('Reassign') }}
        >
            {unplacedErrors.length > 0 && (
                <Alert type="error" showIcon title={unplacedErrors.join(' ')} />
            )}
            <ProFormSelect
                name="assignee"
                label={t('Assign to')}
                required
                options={assignees.map((name) => ({
                    value: name,
                    label: name,
                }))}
            />
        </ResponsiveModalForm>
    );
}

export default function QueueExample({
    tasks,
    assignees,
}: {
    tasks: TaskList;
    assignees: string[];
}) {
    const table = useInertiaTable(tasks, 'tasks');
    const [selected, setSelected] = useState<Key[]>([]);
    // A selected task that the list no longer shows (another tab, completed) is not selected.
    const selectedIds = selected.filter((id) =>
        tasks.rows.some((task) => task.id === id),
    );
    const filters = Array.isArray(tasks.filters) ? {} : tasks.filters;
    const title = t('Support queue');

    // The search form sends its own fields; the tab is kept with them.
    const search = (searched: Record<string, unknown>): void =>
        table.onSubmit({ ...searched, status: tasks.status });

    // Another tab keeps the search, and starts with nothing selected.
    const showTab = (status: string): void => {
        setSelected([]);
        table.onSubmit({ ...filters, status });
    };

    const columns: ProColumns<TaskRow>[] = [
        { title: t('Task'), dataIndex: 'title' },
        { title: t('Customer'), dataIndex: 'customer', search: false },
        {
            title: t('Assignee'),
            dataIndex: 'assignee',
            valueType: 'select',
            valueEnum: Object.fromEntries(
                assignees.map((name) => [name, { text: name }]),
            ),
        },
        {
            title: t('Priority'),
            dataIndex: 'priority',
            valueType: 'select',
            valueEnum: Object.fromEntries(
                Object.entries(taskPriorities).map(([priority, { label }]) => [
                    priority,
                    { text: t(label) },
                ]),
            ),
            render: (_, task) => (
                <Tag color={taskPriorities[task.priority].color}>
                    {t(taskPriorities[task.priority].label)}
                </Tag>
            ),
        },
        {
            title: t('Created on'),
            dataIndex: 'created_on',
            search: false,
            sorter: true,
            sortOrder: sortOrderOf(tasks, 'created_on'),
        },
    ];

    return (
        <>
            <Head title={title} />

            <PageContainer
                title={<PageTitle>{title}</PageTitle>}
                breadcrumb={{ items: [{ title: t('Examples') }, { title }] }}
                tabActiveKey={tasks.status}
                onTabChange={showTab}
                tabList={Object.entries(taskStatuses).map(
                    ([status, label]) => ({
                        key: status,
                        tab: (
                            <Flex gap="small">
                                {t(label)}
                                <Typography.Text
                                    type="secondary"
                                    data-test={`queue-count-${status}`}
                                >
                                    {tasks.counts[status as TaskStatus]}
                                </Typography.Text>
                            </Flex>
                        ),
                    }),
                )}
            >
                <ProTable<TaskRow>
                    rowKey="id"
                    columns={columns}
                    options={false}
                    toolBarRender={false}
                    rowSelection={{
                        selectedRowKeys: selectedIds,
                        onChange: setSelected,
                    }}
                    tableAlertOptionRender={({ onCleanSelected }) => (
                        <Flex gap="small" wrap>
                            {tasks.status !== 'completed' && (
                                <Popconfirm
                                    title={tChoice(
                                        'Mark :count task as completed?|Mark :count tasks as completed?',
                                        selectedIds.length,
                                    )}
                                    okText={t('Mark as completed')}
                                    onConfirm={() =>
                                        completeTasks(selectedIds, () =>
                                            setSelected([]),
                                        )
                                    }
                                >
                                    <Button
                                        size="small"
                                        type="primary"
                                        data-test="complete-tasks-button"
                                    >
                                        {t('Mark as completed')}
                                    </Button>
                                </Popconfirm>
                            )}
                            <ReassignDialog
                                key={selectedIds.join()}
                                ids={selectedIds}
                                assignees={assignees}
                                onReassigned={() => setSelected([])}
                            />
                            <Button
                                size="small"
                                type="link"
                                onClick={onCleanSelected}
                            >
                                {t('Clear selection')}
                            </Button>
                        </Flex>
                    )}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={t('No tasks here')}
                            />
                        ),
                    }}
                    {...table}
                    onSubmit={search}
                    onReset={() => search({})}
                />
            </PageContainer>
        </>
    );
}
