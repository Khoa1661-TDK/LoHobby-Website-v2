// lib/discord/verify.ts — verify Discord interaction request signatures (Ed25519)
import { createPublicKey, verify as cryptoVerify } from 'node:crypto';

// DER SPKI header for an Ed25519 public key, followed by the 32-byte raw key.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export interface VerifyArgs {
  rawBody: string;
  signature: string; // hex, from X-Signature-Ed25519
  timestamp: string; // from X-Signature-Timestamp
  publicKey: string; // hex, the app public key
}

export function verifyDiscordSignature(args: VerifyArgs): boolean {
  try {
    const keyDer = Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(args.publicKey, 'hex')]);
    const key = createPublicKey({ key: keyDer, format: 'der', type: 'spki' });
    return cryptoVerify(
      null,
      Buffer.from(args.timestamp + args.rawBody),
      key,
      Buffer.from(args.signature, 'hex'),
    );
  } catch {
    return false;
  }
}
