// app/profile/addresses-panel.tsx
'use client';

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Fragment,
  useState,
  useTransition,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from '@/app/[locale]/(storefront)/profile/actions';
import type { ProfileAddress } from '@/app/[locale]/(storefront)/profile/types';

type Props = {
  addresses: ProfileAddress[];
};

export default function AddressesPanel({ addresses }: Props): ReactElement {
  const t = useTranslations('profile');
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<ProfileAddress | null>(null);
  const [creating, startCreate] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function close(): void {
    if (creating) return;
    setOpen(false);
    setEditing(null);
  }

  function openCreate(): void {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(address: ProfileAddress): void {
    setEditing(address);
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const isEdit = editing !== null;
    startCreate(async () => {
      const result = isEdit
        ? await updateAddressAction(formData)
        : await createAddressAction(formData);
      if (result.ok) {
        toast.success(t('addressSaved'));
        form.reset();
        setOpen(false);
        setEditing(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleDelete(addressId: string): Promise<void> {
    if (busyId) return;
    setBusyId(addressId);
    const result = await deleteAddressAction(addressId);
    setBusyId(null);
    if (result.ok) {
      toast.success(t('addressDeleted'));
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleSetDefault(addressId: string): Promise<void> {
    if (busyId) return;
    setBusyId(addressId);
    const result = await setDefaultAddressAction(addressId);
    setBusyId(null);
    if (result.ok) {
      toast.success(t('defaultAddressUpdated'));
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('addressesHeading')}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t('addressesSubtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-filament-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-filament-600"
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
          {t('addAddress')}
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {t('noAddressesTitle')}
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {t('noAddressesBody')}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => {
            const busy = busyId === address.id;
            return (
              <li
                key={address.id}
                className={`flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-neutral-950 ${
                  address.isDefault
                    ? 'border-filament-300 ring-1 ring-filament-200 dark:border-filament-700 dark:ring-filament-900/40'
                    : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {address.title}
                      </p>
                      {address.isDefault && (
                        <span className="inline-flex items-center rounded-full bg-filament-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-filament-700 dark:bg-filament-500/15 dark:text-filament-200">
                          {t('defaultBadge')}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                      {address.fullName}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {address.phone}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                  {[
                    address.addressLine,
                    address.ward,
                    address.district,
                    address.city,
                    address.country,
                  ]
                    .filter((part): part is string => typeof part === 'string' && part.length > 0)
                    .join(', ')}
                </p>

                <div className="mt-auto flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(address)}
                    disabled={busy}
                    className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  >
                    {t('editAddress')}
                  </button>
                  {!address.isDefault && (
                    <button
                      type="button"
                      onClick={() => void handleSetDefault(address.id)}
                      disabled={busy}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                    >
                      {t('setAsDefault')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDelete(address.id)}
                    disabled={busy}
                    className="rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-500/10"
                  >
                    {busy ? t('processing') : t('deleteAddress')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Transition show={open} as={Fragment}>
        <Dialog onClose={close} className="relative z-50">
          <TransitionChild
            as={Fragment}
            enter="transition-opacity ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          </TransitionChild>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="transition-all ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transition-all ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-neutral-950">
                <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
                  <DialogTitle className="text-base font-semibold">
                    {editing ? t('editAddressTitle') : t('newAddressTitle')}
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={close}
                    aria-label={t('close')}
                    className="rounded-full p-1 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  >
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <form
                  key={editing?.id ?? 'new'}
                  onSubmit={handleSubmit}
                  className="space-y-4 p-6"
                >
                  {editing ? (
                    <input type="hidden" name="addressId" defaultValue={editing.id} />
                  ) : null}
                  <DialogField label={t('labelField')} htmlFor="address-title">
                    <input
                      id="address-title"
                      name="title"
                      type="text"
                      required
                      defaultValue={editing?.title ?? ''}
                      placeholder={t('labelPlaceholder')}
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </DialogField>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <DialogField label={t('recipientName')} htmlFor="address-fullname">
                      <input
                        id="address-fullname"
                        name="fullName"
                        type="text"
                        required
                        defaultValue={editing?.fullName ?? ''}
                        autoComplete="name"
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </DialogField>
                    <DialogField label={t('phoneLabel')} htmlFor="address-phone">
                      <input
                        id="address-phone"
                        name="phone"
                        type="tel"
                        required
                        defaultValue={editing?.phone ?? ''}
                        autoComplete="tel"
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </DialogField>
                  </div>

                  <DialogField label={t('streetAddress')} htmlFor="address-line">
                    <input
                      id="address-line"
                      name="addressLine"
                      type="text"
                      required
                      defaultValue={editing?.addressLine ?? ''}
                      autoComplete="street-address"
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </DialogField>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <DialogField label={t('wardLabel')} htmlFor="address-ward">
                      <input
                        id="address-ward"
                        name="ward"
                        type="text"
                        defaultValue={editing?.ward ?? ''}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </DialogField>
                    <DialogField label={t('districtLabel')} htmlFor="address-district">
                      <input
                        id="address-district"
                        name="district"
                        type="text"
                        defaultValue={editing?.district ?? ''}
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </DialogField>
                    <DialogField label={t('cityLabel')} htmlFor="address-city">
                      <input
                        id="address-city"
                        name="city"
                        type="text"
                        required
                        defaultValue={editing?.city ?? ''}
                        autoComplete="address-level2"
                        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                    </DialogField>
                  </div>

                  <DialogField label={t('countryLabel')} htmlFor="address-country">
                    <input
                      id="address-country"
                      name="country"
                      type="text"
                      defaultValue={editing?.country ?? 'Việt Nam'}
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-filament-500 focus:outline-none focus:ring-2 focus:ring-filament-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </DialogField>

                  <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      name="isDefault"
                      defaultChecked={editing?.isDefault ?? false}
                      className="h-4 w-4 rounded border-neutral-300 text-filament-500 focus:ring-filament-500 dark:border-neutral-600 dark:bg-neutral-900"
                    />
                    {t('setAsDefaultCheckbox')}
                  </label>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={close}
                      disabled={creating}
                      className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="rounded-full bg-filament-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-filament-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creating ? t('saving') : editing ? t('saveChanges') : t('saveAddress')}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

function DialogField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
