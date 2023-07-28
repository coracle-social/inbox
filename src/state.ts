import {getPublicKey} from 'nostr-tools'
import {writable, derived} from 'svelte/store'
import {getExecutor} from './util'

export const executor = getExecutor(['wss://relay.damus.io'])

export const privkey = writable(localStorage.getItem('privkey'))

export const pubkey = derived(privkey, getPublicKey)

export const messages = writable(new Map())

export const contacts = writable(new Map())

export const draft = writable(null)

export const login = async () => {
  const k = prompt(
    "Please enter your private key (required until NIP 07 supports XChaCha signatures)"
  )

  privkey.set(k)
  localStorage.setItem('privkey', k)
}

