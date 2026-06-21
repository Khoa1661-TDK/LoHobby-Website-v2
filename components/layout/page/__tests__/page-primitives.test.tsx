import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorefrontPageHeader, PageShell } from '../page-primitives';

describe('StorefrontPageHeader', () => {
  it('should render the eyebrow, title and subtitle when all provided', () => {
    render(
      <StorefrontPageHeader eyebrow="About" title="Our workshop" subtitle="3D printed, made to order" />,
    );
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Our workshop' })).toBeInTheDocument();
    expect(screen.getByText('3D printed, made to order')).toBeInTheDocument();
  });

  it('should omit the eyebrow node when no eyebrow is given', () => {
    const { container } = render(<StorefrontPageHeader title="Only title" />);
    expect(container.querySelector('.font-mono')).toBeNull();
  });
});

describe('PageShell', () => {
  it('should apply the narrow max-width class when width is narrow', () => {
    const { container } = render(<PageShell width="narrow">x</PageShell>);
    expect(container.firstChild).toHaveClass('max-w-3xl');
  });
});
