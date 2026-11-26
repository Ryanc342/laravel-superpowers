import { DrawerForm, ModalForm } from '@ant-design/pro-components';
import type { ModalFormProps } from '@ant-design/pro-components';
import { Button, ConfigProvider, Drawer, Flex, Grid, Modal } from 'antd';
import type { DrawerProps, ModalProps } from 'antd';
import { useContext } from 'react';
import type { ReactNode } from 'react';

export type DialogKind = 'modal' | 'sheet';

type Screens = ReturnType<typeof Grid.useBreakpoint>;

/**
 * How a dialog opens: a modal from antd's `md` breakpoint up, and below it,
 * on a phone, a sheet that rises from the bottom. Until the screen is known
 * (the server render, the first render in the browser) it is a sheet.
 */
export function dialogKind(screens: Screens): DialogKind {
    return screens.md === true ? 'modal' : 'sheet';
}

function useDialogKind(): DialogKind {
    return dialogKind(Grid.useBreakpoint());
}

type CancelEvent = Parameters<NonNullable<ModalProps['onCancel']>>[0];

/**
 * Calls a modal's `onCancel` for a sheet. The sheet's own buttons and its
 * drawer give it their events, not the modal's.
 */
function cancel(modal: Pick<ModalProps, 'onCancel'>, event: unknown): void {
    modal.onCancel?.(event as CancelEvent);
}

/**
 * A modal's props, as a sheet has them: the bottom drawer's. It is as tall as
 * its content, and scrolls inside when that is more than 90% of the screen
 * the phone's browser leaves it (`dvh`, without its address bar). A `Drawer`
 * is 378px high by default, and `DrawerForm`'s 800px is taller than a phone.
 */
function sheetProps(
    modal: Omit<ModalProps, 'open'>,
): Omit<DrawerProps, 'open'> {
    return {
        placement: 'bottom',
        size: 'auto',
        styles: { section: { maxHeight: '90dvh' } },
        closable: modal.closable,
        className: modal.className,
        zIndex: modal.zIndex,
        getContainer: modal.getContainer,
        destroyOnHidden: modal.destroyOnHidden,
        keyboard: modal.keyboard,
        maskClosable: modal.maskClosable,
        onClose: (event) => cancel(modal, event),
        afterOpenChange: (open) => {
            if (!open) {
                modal.afterClose?.();
            }
        },
    };
}

type Submitter = ModalFormProps['submitter'];

/**
 * The submitter of a sheet form. A `ModalForm` labels its buttons from
 * `modalProps.okText` and `cancelText`; a `DrawerForm` only from the antd
 * locale, so the sheet gets them as the submitter's labels. Labels the caller
 * sets on the submitter itself come first, and `submitter={false}` stays off.
 */
function sheetSubmitter(
    submitter: Submitter,
    modal: ModalFormProps['modalProps'],
): Submitter {
    if (submitter === false) {
        return false;
    }

    const labels = {
        ...(modal?.okText !== undefined && { submitText: modal.okText }),
        ...(modal?.cancelText !== undefined && { resetText: modal.cancelText }),
    };

    return {
        ...submitter,
        searchConfig: { ...labels, ...submitter?.searchConfig },
    };
}

export type ResponsiveModalProps = Omit<ModalProps, 'footer'> & {
    footer?: ReactNode;
};

/**
 * A `Modal` that is a bottom sheet on a phone. It takes a `Modal`'s props:
 * `closable`, `className`, `zIndex`, `getContainer`, `destroyOnHidden`,
 * `keyboard`, `maskClosable` and `afterClose` carry over to the sheet, and the
 * ones that only make sense for a modal (`width`, `centered`…) do not. Unless
 * `footer` is set, both have the OK and Cancel buttons.
 */
export function ResponsiveModal(props: ResponsiveModalProps) {
    const kind = useDialogKind();
    const { locale } = useContext(ConfigProvider.ConfigContext);

    if (kind === 'modal') {
        return <Modal {...props} />;
    }

    const {
        open,
        title,
        children,
        footer,
        okText,
        cancelText,
        okButtonProps,
        cancelButtonProps,
        confirmLoading,
        onOk,
    } = props;

    return (
        <Drawer
            {...sheetProps(props)}
            open={open}
            title={title}
            footer={
                footer === undefined ? (
                    <Flex justify="flex-end" gap="small">
                        <Button
                            onClick={(event) => cancel(props, event)}
                            {...cancelButtonProps}
                        >
                            {cancelText ??
                                locale?.Modal?.cancelText ??
                                'Cancel'}
                        </Button>
                        <Button
                            type="primary"
                            loading={confirmLoading}
                            onClick={onOk}
                            {...okButtonProps}
                        >
                            {okText ?? locale?.Modal?.okText ?? 'OK'}
                        </Button>
                    </Flex>
                ) : (
                    footer
                )
            }
        >
            {children}
        </Drawer>
    );
}

/**
 * A `ModalForm` that is a bottom-sheet `DrawerForm` on a phone. It takes a
 * `ModalForm`'s props: `modalProps.onCancel`, `afterClose`, `closable`,
 * `className`, `zIndex`, `getContainer`, `destroyOnHidden`, `keyboard`,
 * `maskClosable`, `okText` and `cancelText` carry over to the sheet, and
 * `width` and the rest of `modalProps` do not. `okText` and
 * `cancelText` are the submitter's labels, as in a `ModalForm`, and a label
 * that `submitter.searchConfig` sets wins over them.
 */
export function ResponsiveModalForm<T = Record<string, unknown>>({
    modalProps,
    width,
    ...props
}: ModalFormProps<T>) {
    const kind = useDialogKind();

    if (kind === 'modal') {
        return (
            <ModalForm<T> {...props} modalProps={modalProps} width={width} />
        );
    }

    return (
        <DrawerForm<T>
            {...props}
            submitter={sheetSubmitter(props.submitter, modalProps)}
            drawerProps={sheetProps(modalProps ?? {})}
        />
    );
}
