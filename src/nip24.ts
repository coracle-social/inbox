import type {UnsignedEvent, Event} from 'nostr-tools'
import {getPublicKey, getEventHash, getSignature, generatePrivateKey} from "nostr-tools"
import {xchacha20} from '@noble/ciphers/chacha'
import {secp256k1} from '@noble/curves/secp256k1'
import {sha256} from '@noble/hashes/sha256'
import {randomBytes} from '@noble/hashes/utils'
import {base64} from '@scure/base'
import {now, fromHex} from './util'

export const utf8Decoder = new TextDecoder()

export const utf8Encoder = new TextEncoder()

export const getConversationKey = (privkeyA: string, pubkeyB: string): Uint8Array =>
  sha256(secp256k1.getSharedSecret(privkeyA, '02' + pubkeyB).subarray(1, 33))

export const getNonce = () => base64.encode(randomBytes(24))

export type Nip44Payload = {
  ciphertext: string
  nonce: string
  v: 1
}

export function encrypt(key: Uint8Array, text: string, v = 1): Nip44Payload {
  if (v !== 1) throw new Error('NIP44: unknown encryption version')

  const nonce = randomBytes(24)
  const plaintext = utf8Encoder.encode(text)
  const ciphertext = xchacha20(key, nonce, plaintext)

  return {
    ciphertext: base64.encode(ciphertext),
    nonce: base64.encode(nonce),
    v,
  }
}

export function decrypt(key: Uint8Array, data: Nip44Payload): string {
  if (data.v !== 1) throw new Error('NIP44: unknown encryption version');

  const nonce = base64.decode(data.nonce)
  const ciphertext = base64.decode(data.ciphertext)
  const plaintext = xchacha20(key, nonce, ciphertext)

  return utf8Decoder.decode(plaintext)
}

export const createRumor = (pubkey, {content, recipients, subject}) => {
  const rumor = {
    pubkey,
    content,
    kind: 14,
    created_at: now(),
    tags: recipients.map(k => ["p", k]).concat([["subject", subject]]),
  } as any

  rumor.id = getEventHash(rumor)

  return rumor as UnsignedEvent & {id: string}
}

export const createSeal = (privkey: string, pubkey, rumor) => {
  const sealKey = getConversationKey(privkey, pubkey)
  const content = JSON.stringify(encrypt(sealKey, JSON.stringify(rumor)))

  const seal = {
    content,
    kind: 13,
    created_at: now(5),
    pubkey: getPublicKey(privkey),
    tags: [],
  } as any

  seal.id = getEventHash(seal)
  seal.sig = getSignature(seal, privkey)

  return seal as Event
}

export const createGift = (pubkey, seal, privkey) => {
  const burnerKey = generatePrivateKey()
  const conversationKey = getConversationKey(burnerKey, pubkey)
  const content = JSON.stringify(encrypt(conversationKey, JSON.stringify(seal)))

  const gift = {
    content,
    kind: 1059,
    created_at: now(5),
    pubkey: getPublicKey(burnerKey),
    tags: [["p", pubkey]],
  } as any

  gift.id = getEventHash(gift)
  gift.sig = getSignature(gift, burnerKey)

  return gift as Event
}
