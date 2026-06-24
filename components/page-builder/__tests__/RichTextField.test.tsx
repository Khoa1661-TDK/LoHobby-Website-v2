/// <reference types="vitest" />
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RichTextField from '@/components/page-builder/RichTextField';
import { markdownToLexical } from '@/lib/page-builder/lexical-markdown';

describe('RichTextField', () => {
  it('should seed the textarea from a stored Lexical value', () => {
    const doc = markdownToLexical('Existing text');
    render(<RichTextField value={doc} onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('Existing text');
  });

  it('should seed empty when value is null', () => {
    render(<RichTextField value={null} onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('should commit Lexical JSON on change', () => {
    const onChange = vi.fn();
    render(<RichTextField value={null} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '**bold**' } });
    expect(onChange).toHaveBeenCalled();
    const committed = onChange.mock.calls[0]![0];
    expect(committed).toHaveProperty('root.type', 'root');
  });

  it('should render a markdown hint', () => {
    render(<RichTextField value={null} onChange={() => {}} />);
    expect(screen.getByText(/Markdown/i)).toBeInTheDocument();
  });

  it('should disable the textarea when disabled', () => {
    render(<RichTextField value={null} disabled onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});