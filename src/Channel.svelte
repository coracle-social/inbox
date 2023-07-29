<script lang="ts">
  import {sortBy, prop, identity} from "ramda"
  import MultiSelect from "./MultiSelect.svelte"
  import PersonBadge from "./PersonBadge.svelte"
  import {fuzzy} from "./util"
  import {
    draft,
    executor,
    privkey,
    pubkey,
    contacts,
    messages,
    getName,
    getPicture,
    loadMessages,
  } from "./state"
  import {createRumor, createSeal, createGift} from "./nip24"

  const send = async () => {
    const rumor = createRumor($pubkey, $draft)

    $draft.content = ""

    for (const key of $draft.recipients.concat($pubkey)) {
      const seal = createSeal($privkey, key, rumor)
      const gift = createGift(key, seal, $privkey)

      await executor.publish(gift, {})
    }

    loadMessages()
  }

  $: channelId = sortBy(identity, $draft.recipients.concat($pubkey)).join(",")
  $: channelMessages = $messages.get(channelId) || []
  $: search = fuzzy(Array.from($contacts.values()), {
    keys: ["profile.name", "profile.display_name", "profile.displayName"],
  })
</script>

{#if channelMessages.length > 0}
  <div class="flex flex-col gap-2 py-2">
    {#each channelMessages || [] as m}
      <div class="card-default padding flex flex-col gap-2">
        <PersonBadge
          name={getName($contacts, m.rumor.pubkey)}
          picture={getPicture($contacts, m.rumor.pubkey)} />
        <p class="pl-10">{m.rumor.content}</p>
      </div>
    {/each}
  </div>
{/if}

<div class="flex flex-col gap-2 padding">
  <div class="flex gap-4">
    <label for="subject" class="label">Subject:</label>
    <input name="subject" class="input-default flex-grow" bind:value={$draft.subject} />
  </div>
  <div class="flex gap-4">
    <label for="recipients" class="label">Recipients:</label>
    <MultiSelect name="subject" bind:value={$draft.recipients} toValue={prop("pubkey")} {search}>
      <span slot="item" let:item let:context>
        {#if context === "value"}
          {getName($contacts, item)}
        {:else}
          <PersonBadge
            name={getName($contacts, item.pubkey)}
            picture={getPicture($contacts, item.pubkey)} />
        {/if}
      </span>
    </MultiSelect>
  </div>
  <textarea name="content" class="input-default h-20" bind:value={$draft.content} />
  <div class="flex justify-end">
    <button class="button1 padding" on:click={send}>Send Message</button>
  </div>
</div>
