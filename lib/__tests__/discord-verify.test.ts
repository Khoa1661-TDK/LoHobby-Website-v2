import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyDiscordSignature } from '@/lib/discord/verify';

function makeSignedRequest(body: string, timestamp: string) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString('hex');
  const rawPublicKey = publicKey
    .export({ format: 'der', type: 'spki' })
    .subarray(-32)
    .toString('hex');
  return { signature, rawPublicKey };
}

describe('verifyDiscordSignature', () => {
  it('should return true for a correctly signed request', () => {
    const body = '{"type":1}';
    const timestamp = '1700000000';
    const { signature, rawPublicKey } = makeSignedRequest(body, timestamp);
    expect(
      verifyDiscordSignature({ rawBody: body, signature, timestamp, publicKey: rawPublicKey }),
    ).toBe(true);
  });

  it('should return false when the body is tampered', () => {
    const timestamp = '1700000000';
    const { signature, rawPublicKey } = makeSignedRequest('{"type":1}', timestamp);
    expect(
      verifyDiscordSignature({
        rawBody: '{"type":3}',
        signature,
        timestamp,
        publicKey: rawPublicKey,
      }),
    ).toBe(false);
  });

  it('should return false for a malformed signature instead of throwing', () => {
    expect(
      verifyDiscordSignature({
        rawBody: '{}',
        signature: 'zzzz',
        timestamp: '1',
        publicKey: 'abcd',
      }),
    ).toBe(false);
  });
});
