import {getPublicKey} from "nostr-tools"
import {get, writable, derived} from "svelte/store"
import {getExecutor} from "./util"

export const executor = getExecutor(["wss://relay.damus.io"])

export const privkey = writable(localStorage.getItem("privkey"))

export const pubkey = derived(privkey, getPublicKey)

export const messages = writable(new Map())

export const contacts = writable(new Map())

export const channels = writable([])

export const draft = writable(null)

export const login = async () => {
  const k = prompt(
    "Please enter your private key (required until NIP 07 supports XChaCha signatures)",
  )

  privkey.set(k)
  localStorage.setItem("privkey", k)
}

export const getName = ($contacts, pubkey) => {
  const contact = $contacts.get(pubkey)

  return (
    contact?.profile?.name ||
    contact?.profile?.displayName ||
    contact?.profile?.display_name ||
    pubkey.slice(-8)
  )
}

export const getPicture = ($contacts, pubkey) => $contacts.get(pubkey)?.profile?.picture
