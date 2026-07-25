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

  it('should prefer blockKey over id when both are present, scoping two blocks to different selectors', () => {
    // `blockKey` takes priority over Payload's `id` (see the scopeId comment in
    // CustomHtml.tsx): it survives the per-locale-save stripping that `id` doesn't. Two
    // distinct `blockKey`s here, both with an `id` also present, exercise that precedence —
    // not the random fallback (neither block reaches it, since both have a `blockKey`).
    const first = render(
      <CustomHtmlBlock id="shared-id" blockKey="block-one" html="<p>a</p>" css=".x { color: red }" />,
    );
    const second = render(
      <CustomHtmlBlock id="shared-id" blockKey="block-two" html="<p>b</p>" css=".x { color: blue }" />,
    );

    const firstWrapper = first.container.querySelector('[data-html-block]');
    const secondWrapper = second.container.querySelector('[data-html-block]');
    expect(firstWrapper?.getAttribute('data-html-block')).toBe('block-one');
    expect(secondWrapper?.getAttribute('data-html-block')).toBe('block-two');
    expect(firstWrapper?.getAttribute('data-html-block')).not.toBe(
      secondWrapper?.getAttribute('data-html-block'),
    );

    const firstStyle = first.container.querySelector('style')?.textContent ?? '';
    const secondStyle = second.container.querySelector('style')?.textContent ?? '';
    expect(firstStyle).not.toBe(secondStyle);
    expect(firstStyle).not.toContain(secondWrapper?.getAttribute('data-html-block') ?? '\0');
    expect(secondStyle).not.toContain(firstWrapper?.getAttribute('data-html-block') ?? '\0');
  });

  it('should scope two blocks with neither blockKey nor id to different selectors instead of colliding', () => {
    // Payload's block `id` is stripped on every locale save (src/payload/blocks/_identity.ts)
    // and is absent entirely on a freshly-added, not-yet-saved block — so two customHtml
    // blocks in the same render can both lack `id` *and* `blockKey`. This is the actual
    // random-fallback path: falling back to a shared literal would make one block's CSS
    // bleed into the other's markup.
    const first = render(<CustomHtmlBlock html="<p>a</p>" css=".x { color: red }" />);
    const second = render(<CustomHtmlBlock html="<p>b</p>" css=".x { color: blue }" />);

    const firstWrapper = first.container.querySelector('[data-html-block]');
    const secondWrapper = second.container.querySelector('[data-html-block]');
    expect(firstWrapper?.getAttribute('data-html-block')).toBeTruthy();
    expect(secondWrapper?.getAttribute('data-html-block')).toBeTruthy();
    expect(firstWrapper?.getAttribute('data-html-block')).not.toBe(
      secondWrapper?.getAttribute('data-html-block'),
    );

    const firstStyle = first.container.querySelector('style')?.textContent ?? '';
    const secondStyle = second.container.querySelector('style')?.textContent ?? '';
    expect(firstStyle).not.toBe(secondStyle);
    expect(firstStyle).not.toContain(secondWrapper?.getAttribute('data-html-block') ?? '\0');
    expect(secondStyle).not.toContain(firstWrapper?.getAttribute('data-html-block') ?? '\0');
  });
});
