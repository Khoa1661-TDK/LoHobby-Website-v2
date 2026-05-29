// src/payload/collections/PaymentMethods.ts — admin-managed checkout payment methods.
//
// SECURITY: gateway API credentials CAN be entered here, but they are encrypted
// (AES-256-GCM) in a `beforeChange` hook before being written to Postgres and are
// NEVER returned to the storefront or the public API:
//   - plaintext input fields are admin-only and cleared before persistence,
//   - the encrypted blob `credentialsEnc` has read access denied to everyone,
//   - decryption happens only server-side (see lib/payment-gateway-credentials.ts).
// All other fields (labels, icons, bank info, provider id) remain non-secret.
import type {
  CollectionBeforeChangeHook,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionAfterReadHook,
  CollectionConfig,
  FieldAccess,
} from 'payload';
import { isPayloadAdminUser, payloadPublicReadAdminWrite } from '@/lib/payload-access';
import { revalidatePaymentMethodsCache } from '@/lib/payment-methods';
import { encryptCredentials } from '@/lib/payment-secrets';

import {
  CREDENTIAL_FIELD_LABELS,
  GATEWAY_CREDENTIAL_FIELD_NAMES,
  PAYMENT_PROVIDER_CATALOG,
  PAYMENT_PROVIDER_OPTIONS,
  isPaymentProviderId,
  type GatewayCredentialFieldName,
  type PaymentProviderId,
} from '@/lib/payment-provider-catalog';

const adminOnlyField: FieldAccess = ({ req: { user } }) => isPayloadAdminUser(user);
const denyAll: FieldAccess = () => false;

type GatewayCredentialInput = Partial<Record<GatewayCredentialFieldName, unknown>> & {
  credentialsEnc?: unknown;
  sandboxMode?: unknown;
};

function readCredentialInputs(
  group: GatewayCredentialInput,
  provider: PaymentProviderId,
): Record<string, string> | null {
  const def = PAYMENT_PROVIDER_CATALOG[provider];
  const values: Record<string, string> = {};

  for (const field of def.requiredFields) {
    const value = nonEmptyString(group[field]);
    if (!value) return null;
    values[field] = value;
  }

  return values;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Encrypt freshly entered gateway credentials and strip the plaintext inputs so
 * they are never persisted. Leaving the inputs blank on an update keeps the
 * existing encrypted blob (write-only secret UX).
 */
const encryptGatewayCredentials: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const next = data as Record<string, unknown> & { gatewayCredentials?: GatewayCredentialInput };

  if (next.kind !== 'gateway') {
    next.gatewayCredentials = { credentialsEnc: null, sandboxMode: true };
    return next;
  }

  const providerRaw = nonEmptyString(next.provider);
  const provider = providerRaw && isPaymentProviderId(providerRaw) ? providerRaw : null;
  const group = (next.gatewayCredentials ?? {}) as GatewayCredentialInput;
  const sandboxMode =
    typeof group.sandboxMode === 'boolean'
      ? group.sandboxMode
      : ((originalDoc as { gatewayCredentials?: { sandboxMode?: boolean } } | undefined)
          ?.gatewayCredentials?.sandboxMode ?? true);

  const previousEnc =
    (originalDoc as { gatewayCredentials?: { credentialsEnc?: unknown } } | undefined)
      ?.gatewayCredentials?.credentialsEnc ?? null;

  let credentialsEnc: unknown = previousEnc;

  if (provider) {
    const inputs = readCredentialInputs(group, provider);
    if (inputs) {
      credentialsEnc = encryptCredentials({ provider, ...inputs });
    }
  }

  next.gatewayCredentials = { credentialsEnc, sandboxMode };
  return next;
};

/**
 * Hide secrets from every read: blank the plaintext inputs, drop the encrypted
 * blob, and expose only a boolean indicating whether credentials are stored.
 *
 * The server-side resolver passes `context.exposePaymentSecrets = true` (always
 * with `overrideAccess: true`) to read the raw `credentialsEnc` for decryption.
 */
const maskGatewayCredentials: CollectionAfterReadHook = ({ doc, context }) => {
  const record = doc as Record<string, unknown> & {
    gatewayCredentials?: Record<string, unknown>;
  };

  if (context?.exposePaymentSecrets === true) {
    return record;
  }

  const hasCredentials = Boolean(record.gatewayCredentials?.credentialsEnc);
  const sandboxMode = record.gatewayCredentials?.sandboxMode;
  const masked: Record<string, unknown> = {
    credentialsConfigured: hasCredentials,
    sandboxMode: typeof sandboxMode === 'boolean' ? sandboxMode : true,
  };
  for (const field of GATEWAY_CREDENTIAL_FIELD_NAMES) {
    masked[field] = '';
  }
  record.gatewayCredentials = masked;

  return record;
};

const invalidateOnChange: CollectionAfterChangeHook = ({ doc }) => {
  try {
    revalidatePaymentMethodsCache();
  } catch (error) {
    // Thrown when run outside a request scope (e.g. seed scripts) — safe to ignore.
    console.warn('[payment-methods.afterChange] revalidate skipped:', error);
  }
  return doc;
};

const invalidateOnDelete: CollectionAfterDeleteHook = ({ doc }) => {
  try {
    revalidatePaymentMethodsCache();
  } catch (error) {
    console.warn('[payment-methods.afterDelete] revalidate skipped:', error);
  }
  return doc;
};

export const PaymentMethods: CollectionConfig = {
  slug: 'payment-methods',
  labels: {
    singular: 'Payment method',
    plural: 'Payment methods',
  },
  access: payloadPublicReadAdminWrite,
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'key', 'kind', 'enabled', 'sortOrder'],
    group: 'Settings',
    description:
      'Payment options shown at checkout. Gateway API keys entered here are encrypted before saving and are never sent to the storefront.',
  },
  hooks: {
    beforeChange: [encryptGatewayCredentials],
    afterChange: [invalidateOnChange],
    afterDelete: [invalidateOnDelete],
    afterRead: [maskGatewayCredentials],
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          'Stable identifier used in orders and code. Lowercase, no spaces (e.g. cod, bank-transfer, payos). Do not change once orders exist.',
        placeholder: 'bank-transfer',
      },
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: {
        description: 'Name shown to customers at checkout.',
        placeholder: 'Chuyển khoản ngân hàng',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Short helper text shown under the label at checkout.',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Uncheck to hide this method from checkout without deleting it.',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Lower numbers appear first.',
        step: 1,
      },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'manual_transfer',
      admin: {
        description:
          'How this method is processed. "Manual transfer" and "Cash" need no API keys; "Gateway" uses a server-configured provider.',
      },
      options: [
        { label: 'Cash on delivery / pickup', value: 'cod' },
        { label: 'Manual bank transfer (static QR)', value: 'manual_transfer' },
        { label: 'Automated gateway', value: 'gateway' },
      ],
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional icon/logo shown beside the method.',
      },
    },
    {
      name: 'provider',
      type: 'select',
      options: [...PAYMENT_PROVIDER_OPTIONS],
      admin: {
        condition: (_data, sibling) => sibling?.kind === 'gateway',
        description: 'Gateway provider used to process this method.',
      },
    },
    {
      name: 'gatewayCredentials',
      type: 'group',
      admin: {
        condition: (_data, sibling) => sibling?.kind === 'gateway',
        description:
          'API credentials for this gateway. Encrypted before saving — leave credential fields blank when editing to keep existing keys. Register the webhook URL shown in the provider dashboard (see README).',
      },
      fields: [
        {
          name: 'credentialsConfigured',
          type: 'checkbox',
          virtual: true,
          admin: {
            readOnly: true,
            description: 'Indicates whether encrypted credentials are currently stored.',
          },
        },
        {
          name: 'sandboxMode',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Use sandbox/test endpoints for this gateway (uncheck for production).',
          },
        },
        ...GATEWAY_CREDENTIAL_FIELD_NAMES.map((fieldName) => ({
          name: fieldName,
          type: 'text' as const,
          access: {
            read: adminOnlyField,
            create: adminOnlyField,
            update: adminOnlyField,
          },
          admin: {
            autoComplete: 'off',
            placeholder: CREDENTIAL_FIELD_LABELS[fieldName],
            condition: (data: Record<string, unknown>) => {
              const provider = data?.provider;
              return (
                data?.kind === 'gateway' &&
                typeof provider === 'string' &&
                isPaymentProviderId(provider) &&
                PAYMENT_PROVIDER_CATALOG[provider].requiredFields.includes(fieldName)
              );
            },
          },
        })),
        {
          name: 'credentialsEnc',
          type: 'text',
          admin: { hidden: true },
          access: {
            read: denyAll,
            create: adminOnlyField,
            update: adminOnlyField,
          },
        },
      ],
    },
    {
      name: 'transferDetails',
      type: 'group',
      admin: {
        condition: (_data, sibling) => sibling?.kind === 'manual_transfer',
        description: 'Bank account details shown to the customer to complete the transfer.',
      },
      fields: [
        {
          name: 'bankName',
          type: 'text',
          admin: { placeholder: 'Vietcombank' },
        },
        {
          name: 'accountNumber',
          type: 'text',
          admin: { placeholder: '0123456789' },
        },
        {
          name: 'accountHolder',
          type: 'text',
          admin: { placeholder: 'CONG TY ABC' },
        },
        {
          name: 'transferNote',
          type: 'text',
          admin: {
            description:
              'Optional prefix for the transfer content. The order code is always appended automatically.',
            placeholder: 'LOHOBBY',
          },
        },
        {
          name: 'qrImage',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Static VietQR image customers can scan to pay.',
          },
        },
      ],
    },
    {
      name: 'instructions',
      type: 'textarea',
      admin: {
        description: 'Extra instructions shown to the customer after they place the order.',
      },
    },
  ],
};
