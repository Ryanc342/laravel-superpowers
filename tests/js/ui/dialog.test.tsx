import { ProFormText } from '@ant-design/pro-components';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Grid } from 'antd';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { dialogKind, ResponsiveModal, ResponsiveModalForm } from '@/ui/dialog';

type Screens = ReturnType<typeof Grid.useBreakpoint>;

const phone: Screens = { xs: true };
const desktop: Screens = { xs: true, sm: true, md: true };

/** Sets the screen the dialogs are opened on. */
function onScreen(screens: Screens): void {
    vi.spyOn(Grid, 'useBreakpoint').mockReturnValue(screens);
}

afterEach(() => {
    vi.restoreAllMocks();
});

test('a dialog is a modal from the md breakpoint up and a sheet below it', () => {
    expect(dialogKind({ md: true })).toBe('modal');
    expect(dialogKind({ xs: true, sm: true, md: true, lg: true })).toBe(
        'modal',
    );
    expect(dialogKind({ xs: true })).toBe('sheet');
    expect(dialogKind({ xs: true, sm: true, md: false })).toBe('sheet');
});

test('a dialog is a sheet before the screen size is known', () => {
    expect(dialogKind({})).toBe('sheet');
});

test('on a phone a dialog rises from the bottom as a drawer', () => {
    onScreen(phone);
    render(
        <ResponsiveModal open title="Delete">
            Are you sure?
        </ResponsiveModal>,
    );

    expect(document.querySelector('.ant-drawer-bottom')).not.toBeNull();
    expect(document.querySelector('.ant-modal')).toBeNull();
    expect(screen.getByText('Delete')).toBeTruthy();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
});

test('from md up a dialog is a modal', () => {
    onScreen(desktop);
    render(
        <ResponsiveModal open title="Delete">
            Are you sure?
        </ResponsiveModal>,
    );

    expect(document.querySelector('.ant-modal')).not.toBeNull();
    expect(document.querySelector('.ant-drawer')).toBeNull();
    expect(screen.getByText('Are you sure?')).toBeTruthy();
});

test('a sheet has the modal’s OK and Cancel buttons and calls its handlers', async () => {
    onScreen(phone);
    const onOk = vi.fn();
    const onCancel = vi.fn();
    render(
        <ResponsiveModal open title="Delete" onOk={onOk} onCancel={onCancel}>
            Are you sure?
        </ResponsiveModal>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'OK' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOk).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
});

test('a sheet closes through the modal’s onCancel, from its close button too', async () => {
    onScreen(phone);
    const onCancel = vi.fn();
    render(
        <ResponsiveModal open title="Delete" onCancel={onCancel}>
            Are you sure?
        </ResponsiveModal>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
});

test('a sheet keeps a footer the caller sets, and has none when it is turned off', () => {
    onScreen(phone);
    const { rerender } = render(
        <ResponsiveModal open footer={<span>Own footer</span>}>
            Body
        </ResponsiveModal>,
    );

    expect(screen.getByText('Own footer')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();

    rerender(
        <ResponsiveModal open footer={null}>
            Body
        </ResponsiveModal>,
    );

    expect(document.querySelector('.ant-drawer-footer')).toBeNull();
});

test('on a phone a modal form is a bottom drawer, and it submits', async () => {
    onScreen(phone);
    const onFinish = vi.fn(async () => true);
    render(
        <ResponsiveModalForm<{ name: string }>
            open
            title="New"
            onFinish={onFinish}
        >
            <ProFormText name="name" label="Name" />
        </ResponsiveModalForm>,
    );

    expect(document.querySelector('.ant-drawer-bottom')).not.toBeNull();
    expect(document.querySelector('.ant-modal')).toBeNull();

    await userEvent.type(screen.getByLabelText('Name'), 'Ada');
    await userEvent.click(screen.getByRole('button', { name: /OK|确/ }));

    expect(onFinish).toHaveBeenCalledWith({ name: 'Ada' });
});

test('from md up a modal form is a modal', () => {
    onScreen(desktop);
    render(
        <ResponsiveModalForm open title="New">
            <ProFormText name="name" label="Name" />
        </ResponsiveModalForm>,
    );

    expect(document.querySelector('.ant-modal')).not.toBeNull();
    expect(document.querySelector('.ant-drawer')).toBeNull();
});

test('a sheet form closes through the modal’s onCancel', async () => {
    onScreen(phone);
    const onCancel = vi.fn();
    render(
        <ResponsiveModalForm open title="New" modalProps={{ onCancel }}>
            <ProFormText name="name" label="Name" />
        </ResponsiveModalForm>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
});

test('a sheet form has the button labels the modal form has, from modalProps', () => {
    onScreen(phone);
    render(
        <ResponsiveModalForm
            open
            title="New"
            modalProps={{ okText: 'Create', cancelText: 'Dismiss' }}
        >
            <ProFormText name="name" label="Name" />
        </ResponsiveModalForm>,
    );

    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy();
});

test('a sheet form keeps the labels of its own submitter over modalProps', () => {
    onScreen(phone);
    render(
        <ResponsiveModalForm
            open
            title="New"
            modalProps={{ okText: 'Create', cancelText: 'Dismiss' }}
            submitter={{ searchConfig: { submitText: 'Save' } }}
        >
            <ProFormText name="name" label="Name" />
        </ResponsiveModalForm>,
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create' })).toBeNull();
});

test('a sheet form with no submitter has no buttons, whatever modalProps say', () => {
    onScreen(phone);
    render(
        <ResponsiveModalForm
            open
            title="New"
            modalProps={{ okText: 'Create' }}
            submitter={false}
        >
            <ProFormText name="name" label="Name" />
        </ResponsiveModalForm>,
    );

    expect(screen.queryByRole('button', { name: 'Create' })).toBeNull();
    expect(document.querySelector('.ant-drawer-footer')).toBeNull();
});

test('a modal form has the same labels from modalProps', () => {
    onScreen(desktop);
    render(
        <ResponsiveModalForm
            open
            title="New"
            modalProps={{ okText: 'Create', cancelText: 'Dismiss' }}
        >
            <ProFormText name="name" label="Name" />
        </ResponsiveModalForm>,
    );

    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy();
});
