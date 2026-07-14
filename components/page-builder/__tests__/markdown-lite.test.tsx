import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { renderMarkdownLite } from '@/lib/page-builder/assistant/markdown-lite';

describe('renderMarkdownLite', () => {
  it('should render **bold** as a <strong> element', () => {
    const { container } = render(<div>{renderMarkdownLite('a **bold** word')}</div>);
    const strong = container.querySelector('strong');
    expect(strong?.textContent).toBe('bold');
  });

  it('should render *italic* as an <em> element', () => {
    const { container } = render(<div>{renderMarkdownLite('an *italic* word')}</div>);
    const em = container.querySelector('em');
    expect(em?.textContent).toBe('italic');
  });

  it('should render "- " lines as a bullet list', () => {
    const { container } = render(<div>{renderMarkdownLite('- one\n- two')}</div>);
    const items = container.querySelectorAll('ul li');
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toBe('one');
    expect(items[1]?.textContent).toBe('two');
  });

  it('should split lines into separate paragraphs (line breaks)', () => {
    const { container } = render(<div>{renderMarkdownLite('line one\nline two')}</div>);
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
  });

  it('should pass plain text through unchanged', () => {
    const { container } = render(<div>{renderMarkdownLite('just plain text')}</div>);
    expect(container.textContent).toBe('just plain text');
    expect(container.querySelector('strong')).toBeNull();
    expect(container.querySelector('em')).toBeNull();
  });

  it('should not inject raw HTML from the model output', () => {
    const { container } = render(
      <div>{renderMarkdownLite('<img src=x onerror="alert(1)"> and <b>hi</b>')}</div>,
    );
    // The literal tags must appear as text, never as real DOM elements.
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
    expect(container.textContent).toContain('<b>hi</b>');
  });
});
