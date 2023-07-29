<script lang="ts">
  import "@fortawesome/fontawesome-free/css/fontawesome.css"
  import "@fortawesome/fontawesome-free/css/solid.css"

  import {get} from "svelte/store"
  import Channel from "./Channel.svelte"
  import ChannelList from "./ChannelList.svelte"
  import {
    contacts,
    channels,
    messages,
    draft,
    privkey,
    pubkey,
    login,
    loadMessages,
  } from "./state"

  Object.assign(window, {get, pubkey, privkey, messages, contacts, channels})

  const newMessage = () => {
    draft.set({subject: "", content: "", recipients: []})
  }

  const clearMessage = () => {
    draft.set(null)
  }

  pubkey.subscribe($pubkey => {
    if ($pubkey) {
      loadMessages()
    }
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
