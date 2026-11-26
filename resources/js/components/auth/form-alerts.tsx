import { Alert } from 'antd';

/**
 * What a form page says above its fields: the server's status message (it
 * stays, so it is not closable), and the errors that belong to no field of the
 * form, which `useInertiaForm` hands back as `unplacedErrors`.
 */
export default function FormAlerts({
    status,
    errors = [],
}: {
    status?: string;
    errors?: string[];
}) {
    return (
        <>
            {status && <Alert type="success" showIcon title={status} />}
            {errors.length > 0 && (
                <Alert type="error" showIcon title={errors.join(' ')} />
            )}
        </>
    );
}
