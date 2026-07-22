import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import Search from '@/components/layout/navbar/search';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

const messages = {
  search: {
    placeholder: 'Search keychains, models, figures…',
    submitAria: 'Search',
    suggestionsAria: 'Product suggestions',
    suggestionCount: '{count} suggestions',
    noResults: 'No results found.',
  },
};

const suggestions = [
  { handle: 'model-a', title: 'Model A', image: '/a.jpg', price: '100000', currencyCode: 'VND' },
  { handle: 'model-b', title: 'Model B', image: '/b.jpg', price: '200000', currencyCode: 'VND' },
];

beforeEach(() => {
  push.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ suggestions }) })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderSearch() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <Search />
    </NextIntlClientProvider>,
  );
}

describe('Search combobox', () => {
  it('should expose the input as a combobox that starts collapsed', () => {
    renderSearch();
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('should expand and list options once suggestions arrive', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
  });

  it('should not set aria-activedescendant before any option is highlighted', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant');
  });

  it('should move the highlight with ArrowDown and track it in aria-activedescendant', async () => {
    const user = userEvent.setup();
    renderSearch();
    const input = screen.getByRole('combobox');
    await user.type(input, 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{ArrowDown}');
    const first = screen.getAllByRole('option')[0]!;
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', first.id);

    await user.keyboard('{ArrowDown}');
    const second = screen.getAllByRole('option')[1]!;
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', second.id);
  });

  it('should wrap from the last option back to the first', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('should navigate to the highlighted product on Enter', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{ArrowDown}{Enter}');
    expect(push).toHaveBeenCalledWith('/product/model-a');
  });

  it('should submit the raw query on Enter when nothing is highlighted', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/search?q=model');
  });

  it('should close the listbox on Escape', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'model');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('should show a no-results affordance instead of an empty box', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ suggestions: [] }) })),
    );
    const user = userEvent.setup();
    renderSearch();
    await user.type(screen.getByRole('combobox'), 'zzzz');
    await waitFor(() => expect(screen.getByText('No results found.')).toBeInTheDocument());
  });
});
