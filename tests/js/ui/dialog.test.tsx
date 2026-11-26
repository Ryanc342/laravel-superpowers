import { ProFormText } from '@ant-design/pro-components';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Grid } from 'antd';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { dialogKind, ResponsiveModal, ResponsiveModalForm } from '@/ui/dialog';
import { useInertiaForm } from '@/ui/form';

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

/** A container for a dialog, in the page, and the props that put a dialog in it. */
function ownContainer() {
    const container = document.createElement('div');
    document.body.append(container);

    return {
        container,
        props: {
            closable: false,
            className: 'delete-dialog',
            zIndex: 1234,
            getContainer: () => container,
        },
    };
}

test('a sheet keeps the modal’s closable, className, zIndex and container', () => {
    onScreen(phone);
    const { container, props } = ownContainer();
    render(
        <ResponsiveModal open title="Delete" {...props}>
            Are you sure?
        </ResponsiveModal>,
    );

    const drawer = container.querySelector<HTMLElement>('.ant-drawer');

    expect(drawer).not.toBeNull();
    expect(container.querySelector('.delete-dialog')).not.toBeNull();
    expect(container.querySelector('.ant-drawer-close')).toBeNull();
    expect(drawer?.style.zIndex).toBe('1234');
    container.remove();
});

test('a sheet form keeps the closable, className, zIndex and container of modalProps', () => {
    onScreen(phone);
    const { container, props } = ownContainer();
    render(
        <ResponsiveModalForm open title="New order" modalProps={props}>
            <ProFormText name="name" label="Name" />
        </ResponsiveModalForm>,
    );

    const drawer = container.querySelector<HTMLElement>('.ant-drawer');

    expect(drawer).not.toBeNull();
    expect(container.querySelector('.delete-dialog')).not.toBeNull();
    expect(container.querySelector('.ant-drawer-close')).toBeNull();
    expect(drawer?.style.zIndex).toBe('1234');
    container.remove();
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

/** A dialog form that spreads the forms glue's props, as a page's Quick add does. */
function GlueDialogForm() {
    const { formProps } = useInertiaForm(
        { url: '/orders', method: 'post' },
        { name: '' },
        { precognitive: false },
    );

    return (
        <ResponsiveModalForm open title="New" {...formProps}>
            <ProFormText name="name" label="Name" />
        </ResponsiveModalForm>
    );
}

// The server is the only validator: the browser's own checks stay off in a
// dialog too, whichever form (ModalForm or DrawerForm) it renders.
test.each([
    ['modal', desktop],
    ['sheet', phone],
])(
    'a %s form keeps the browser checks off that the forms glue turns off',
    (_, screens) => {
        onScreen(screens);
        render(<GlueDialogForm />);

        const form = document.querySelector(
            '.ant-modal form, .ant-drawer form',
        );

        expect(form?.hasAttribute('novalidate')).toBe(true);
    },
);
