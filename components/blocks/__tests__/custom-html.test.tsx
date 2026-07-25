import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import CustomHtmlBlock from '@/components/blocks/CustomHtml';

describe('CustomHtml block', () => {
  it('should render nothing when html is empty', () => {
    const { container } = render(<CustomHtmlBlock id="a" html="" />);
    expect(container.innerHTML).toBe('');
  });

  it('should render sanitized markup', () => {
    const { container } = render(
      <CustomHtmlBlock id="a" html='<section class="x"><h2>Title</h2></section>' />,
    );
    expect(container.querySelector('h2')?.textContent).toBe('Title');
  });

  it('should not render a script from the stored html', () => {
    const { container } = render(
      <CustomHtmlBlock id="a" html='<p>ok</p><script>window.x=1</script>' />,
    );
    expect(container.querySelector('script')).toBeNull();
  });

  it('should tag the wrapper with the block id for css scoping', () => {
    const { container } = render(<CustomHtmlBlock id="blk1" html="<p>x</p>" />);
    expect(container.querySelector('[data-html-block="blk1"]')).not.toBeNull();
  });

  it('should emit scoped css when css is provided', () => {
    const { container } = render(
      <CustomHtmlBlock id="blk1" html="<p>x</p>" css=".a { color: red }" />,
    );
    const style = container.querySelector('style');
    expect(style?.textContent).toContain('[data-html-block="blk1"] .a');
  });

  it('should emit no style element when css is absent', () => {
    const { container } = render(<CustomHtmlBlock id="blk1" html="<p>x</p>" />);
    expect(container.querySelector('style')).toBeNull();
  });
});
