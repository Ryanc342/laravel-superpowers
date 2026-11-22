import { render, screen } from '@testing-library/react';
import { expect, it } from 'vite-plus/test';
import { Button } from '@/components/ui/button';

it('renders a button with its label as the accessible name', () => {
    render(<Button>Save</Button>);

    const button = screen.getByRole('button', { name: 'Save' });

    expect(button.tagName).toBe('BUTTON');
});

it('cannot be pressed while disabled', () => {
    render(<Button disabled>Save</Button>);

    expect(
        screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled'),
    ).toBe(true);
});
