import type {Event} from "nostr-tools"
import {uniqBy, identity, sortBy, prop} from "ramda"
import {batch, chunk} from "hurdak"
import {getPublicKey} from "nostr-tools"
import {get, writable, derived} from "svelte/store"
import {getExecutor, getMeta, fromHex} from "./util"
import {decrypt, utf8Encoder, getConversationKey} from "./nip24"

export const executor = getExecutor([
  "wss://relay.damus.io",
  "wss://relayable.org",
  "wss://offchain.pub",
  "wss://nostr-pub.wellorder.net",
  "wss://nostr-relay.app",
])

export const sub = writable(null)

export const privkey = writable(localStorage.getItem("privkey"))

export const pubkey = derived(privkey, k => (k ? getPublicKey(k) : null))

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

export const onProfileEvent = batch(500, (events: Event[]) => {
  const $pubkey = get(pubkey)

  contacts.update($contacts => {
    for (const e of events) {
      const p = $contacts.get(e.pubkey) || {
        pubkey: e.pubkey,
        relays_updated_at: 0,
        profile_updated_at: 0,
        petnames_updated_at: 0,
      }

      if (e.kind === 0 && e.created_at > p.profile_updated_at) {
        try {
          p.profile = JSON.parse(e.content)
          p.profile_updated_at = e.created_at
        } catch (e) {
          console.warn(e)

          continue
        }
      }

      if (e.kind === 3 && e.created_at > p.petnames_updated_at) {
        p.petnames = e.tags
        p.petnames_updated_at = e.created_at

        if (p.pubkey === $pubkey) {
          e.tags.filter(t => t[0] === "p").map(t => loadPubkey(t[1]))
        }
      }

      if (e.kind === 10002 && e.created_at > p.relays_updated_at) {
        p.relays = e.tags
        p.relays_updated_at = e.created_at
      }

      $contacts.set(e.pubkey, p)
    }

    return $contacts
  })
})

export const loadPubkey = batch(500, pubkeys => {
  chunk(255, Array.from(new Set(pubkeys))).forEach(authors => {
    const sub = executor.subscribe([{kinds: [0, 3, 10002], authors}], {
      onEvent: (url, e) => onProfileEvent(e),
    })

    setTimeout(() => sub.unsubscribe(), 3000)
  })
})

export const onEvent = batch(500, (events: Event[]) => {
  const $privkey = get(privkey)
  const key = fromHex($privkey)

  const newMessages = events
    .map(gift => {
      let seal, rumor

      try {
        const sealKey = getConversationKey($privkey, gift.pubkey)
        seal = JSON.parse(decrypt(sealKey, JSON.parse(gift.content)))

        const rumorKey = getConversationKey($privkey, seal.pubkey)
        rumor = JSON.parse(decrypt(rumorKey, JSON.parse(seal.content)))
      } catch (e) {
        console.warn(e)

        return
      }

      const pubkeys = rumor.tags
        .filter(t => t[0] === "p")
        .map(t => t[1])
        .concat(rumor.pubkey)
      const channel = sortBy(identity, pubkeys).join(",")

      return {gift, seal, rumor, channel}
    })
    .filter(identity)

  channels.update($channels => {
    const newChannels = newMessages.map(m => ({
      id: m.channel,
      pubkeys: m.channel.split(","),
      subject: getMeta(m.rumor).subject,
    }))

    return uniqBy(prop("id"), $channels.concat(newChannels))
  })

  messages.update($messages => {
    for (const msg of newMessages) {
      const msgs = $messages.get(msg.channel) || []
      const combined = uniqBy(m => m.gift.id, msgs.concat(msg))

      $messages.set(msg.channel, combined)

      loadPubkey(msg.seal.pubkey)
      loadPubkey(getMeta(msg.rumor).p)
    }

    return $messages
  })
})

export const loadMessages = () => {
  sub.update($sub => {
    $sub?.unsubscribe()

    return executor.subscribe([{kinds: [1059], "#p": [get(pubkey)]}], {
      onEvent: (url, e: Event) => onEvent(e),
    })
  })
}
