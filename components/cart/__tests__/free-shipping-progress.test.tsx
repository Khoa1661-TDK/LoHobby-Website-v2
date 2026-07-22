import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import FreeShippingProgress from '@/components/cart/free-shipping-progress';

const messages = {
  cart: {
    freeShippingRemaining: 'Add <amount></amount> more for free shipping',
    freeShippingQualified: "You've earned free shipping!",
    freeShippingProgressAria: 'Free shipping progress',
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('FreeShippingProgress', () => {
  it('should render nothing when the threshold is zero', () => {
    const { container } = renderWithIntl(
      <FreeShippingProgress subtotalVnd={300000} currencyCode="VND" thresholdVnd={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('should show the remaining amount when below the threshold', () => {
    renderWithIntl(
      <FreeShippingProgress subtotalVnd={300000} currencyCode="VND" thresholdVnd={500000} />,
    );
    expect(screen.getByText(/more for free shipping/)).toBeInTheDocument();
  });

  it('should expose the progress bar with the correct aria values when below', () => {
    renderWithIntl(
      <FreeShippingProgress subtotalVnd={300000} currencyCode="VND" thresholdVnd={500000} />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '60');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should show the qualified message at the threshold', () => {
    renderWithIntl(
      <FreeShippingProgress subtotalVnd={500000} currencyCode="VND" thresholdVnd={500000} />,
    );
    expect(screen.getByText("You've earned free shipping!")).toBeInTheDocument();
  });

  it('should show the qualified message above the threshold', () => {
    renderWithIntl(
      <FreeShippingProgress subtotalVnd={900000} currencyCode="VND" thresholdVnd={500000} />,
    );
    expect(screen.getByText("You've earned free shipping!")).toBeInTheDocument();
  });
});
