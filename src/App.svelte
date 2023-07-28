<script lang="ts">
  import "@fortawesome/fontawesome-free/css/fontawesome.css"
  import "@fortawesome/fontawesome-free/css/solid.css"

  import cx from "classnames"
  import {batch, chunk} from "hurdak"
  import {onMount, onDestroy} from "svelte"
  import {sortBy, uniqBy, identity, uniq, prop} from "ramda"
  import type {Event} from "nostr-tools"
  import {fly, fade} from "svelte/transition"
  import {get} from "svelte/store"
  import Channel from "./Channel.svelte"
  import ChannelList from "./ChannelList.svelte"
  import {fromHex, getMeta} from "./util"
  import {executor, contacts, channels, messages, draft, privkey, pubkey, login} from "./state"
  import {decrypt, utf8Encoder, getConversationKey} from "./nip24"

  Object.assign(window, {get, messages, contacts, channels})

  const newMessage = () => {
    draft.set({subject: "", content: "", recipients: []})
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

  const loadPubkey = batch(500, pubkeys => {
    chunk(255, Array.from(new Set(pubkeys))).forEach(authors => {
      const sub = executor.subscribe([{kinds: [0, 3, 10002], authors}], {
        onEvent: (url, e) => onProfileEvent(e),
      })

      setTimeout(() => sub.unsubscribe(), 3000)
    })
  })

  const onEvent = batch(500, (events: Event[]) => {
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


  const loadMessages = () => {
    return executor.subscribe([{kinds: [1059], "#p": [$pubkey]}], {
      onEvent: (url, e: Event) => onEvent(e),
    })
  }

  let sub

  pubkey.subscribe($pubkey => {
    if ($pubkey) {
      sub?.unsubscribe()
      loadMessages()
    }
  })

  onMount(() => {
    if ($privkey) {
      sub = loadMessages()
    }
  })

  onDestroy(() => {
    sub?.unsubscribe()
  })
</script>

<div class="max-w-screen-md mx-2 md:mx-auto">
  <div class="padding flex items-center justify-between border-b border-blue-100 border-solid">
    <h1 class="text-2xl cursor-pointer" on:click={() => draft.set(null)}>Inbox</h1>
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
  <div>
    {#if $draft}
      <Channel />
    {:else}
      <ChannelList />
    {/if}
  </div>
  <small class="padding text-gray-400 text-center block">
    <a class="underline" href="https://github.com/coracle-social/inbox" target="_blank">Inbox</a>
    is powered by NIP-59 and NIP-112.
  </small>
</div>
