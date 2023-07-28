<script lang="ts">
  import "@fortawesome/fontawesome-free/css/fontawesome.css"
  import "@fortawesome/fontawesome-free/css/solid.css"

  import cx from "classnames"
  import {batch} from "hurdak"
  import {onMount, onDestroy} from 'svelte'
  import {uniqBy, prop} from "ramda"
  import type {Event} from "nostr-tools"
  import {fly, fade} from "svelte/transition"
  import {get} from "svelte/store"
  import Thread from "./Thread.svelte"
  import {fromHex, getMeta} from "./util"
  import {executor, contacts, messages, draft, privkey, pubkey, login} from "./state"
  import {decrypt, utf8Encoder, getConversationKey} from "./nip24"

  Object.assign(window, {get, messages, contacts})

  const newMessage = () => {
    draft.set({
      subject: "Hi Vitor",
      content: "hello",
      recipients: ["460c25e682fda7832b52d1f22d3d22b3176d972f60dcdc3212ed8c92ef85065c"],
    })
  }

  const clearMessage = () => {
    draft.set(null)
  }

  const onProfileEvent = batch(500, (events: Event[]) => {
    contacts.update($contacts => {
      for (const e of events) {
        const p = $contacts.get(e.pubkey) || {
          pubkey: e.pubkey,
          relays_updated_at: 0,
          profile_updated_at: 0,
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

        if (e.kind === 10002) {
          p.relays = e.tags
          p.relays_updated_at = e.created_at
        }

        $contacts.set(e.pubkey, p)
      }

      return $contacts
    })
  })

  const loadPubkey = batch(500, pubkeys => {
    pubkeys = Array.from(new Set(pubkeys))

    const sub = executor.subscribe([{kinds: [0, 10002], authors: pubkeys}], {
      onEvent: (url, e) => onProfileEvent(e),
    })

    setTimeout(() => sub.unsubscribe(), 3000)
  })

  const onEvent = batch(500, (events: Event[]) => {
    const key = fromHex($privkey)

    messages.update($messages => {
      for (const gift of events) {
        let seal, rumor

        try {
          const sealKey = getConversationKey($privkey, gift.pubkey)
          seal = JSON.parse(decrypt(sealKey, JSON.parse(gift.content)))

          const rumorKey = getConversationKey($privkey, seal.pubkey)
          rumor = JSON.parse(decrypt(rumorKey, JSON.parse(seal.content)))
        } catch (e) {
          console.warn(e)

          continue
        }

        const msg = {gift, seal, rumor}
        const msgs = $messages.get(seal.pubkey) || []
        const combined = uniqBy(m => m.gift.id, msgs.concat(msg))

        $messages.set(seal.pubkey, combined)
        loadPubkey(seal.pubkey)
        loadPubkey(getMeta(rumor).p)
      }

      return $messages
    })
  })

  let sub

  onMount(() => {
    sub = executor.subscribe([{kinds: [1059], "#p": [$pubkey]}], {
      onEvent: (url, e: Event) => onEvent(e),
    })
  })

  onDestroy(() => {
    sub.unsubscribe()
  })
</script>

<div class="max-w-screen-md mx-auto">
  <div class="padding flex items-center justify-between border-b border-blue-100 border-solid">
    <h1 class="text-2xl">Gift Wrapper</h1>
    <div class="flex justify-end">
      {#if $pubkey}
        {#if $draft}
          <button class="padding button2" on:click={clearMessage}> Go Back </button>
        {:else}
          <button class="padding button1" on:click={newMessage}> New Message </button>
        {/if}
      {:else}
        <button class="padding button1" on:click={login}> Log In </button>
      {/if}
    </div>
  </div>
  <div class="padding">
    {#if $draft}
      <Thread />
    {/if}
  </div>
  <small class="padding text-gray-400 text-center block">
    Gift Wrapper is powered by NIP-59 and NIP-112.
  </small>
</div>
