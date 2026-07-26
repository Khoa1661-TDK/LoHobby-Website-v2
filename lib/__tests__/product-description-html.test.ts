import { describe, expect, it } from 'vitest';
import { plainTextToHtml } from '@/lib/payload-products';

describe('plainTextToHtml', () => {
  it('should keep single line breaks visible when lines are separated by one newline', () => {
    const html = plainTextToHtml('• Chất liệu an toàn\n• Bảo hành 1 tháng');

    expect(html).toBe('<p>• Chất liệu an toàn<br />• Bảo hành 1 tháng</p>');
  });

  it('should split into separate paragraphs when lines are separated by a blank line', () => {
    const html = plainTextToHtml('Tiêu đề sản phẩm\n\nMô tả chi tiết');

    expect(html).toBe('<p>Tiêu đề sản phẩm</p><p>Mô tả chi tiết</p>');
  });

  it('should escape html so stored text cannot inject markup', () => {
    const html = plainTextToHtml('<script>alert("x")</script> & co');

    expect(html).toBe(
      '<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</p>',
    );
  });

  it('should drop empty lines and surrounding whitespace', () => {
    const html = plainTextToHtml('  Dòng một  \n\n\n\n   \n  Dòng hai  \n');

    expect(html).toBe('<p>Dòng một</p><p>Dòng hai</p>');
  });

  it('should return an empty string when the text has no content', () => {
    expect(plainTextToHtml('   \n\n  ')).toBe('');
  });
});
