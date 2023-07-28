<script lang="ts">
  import {getPublicKey, getEventHash, getSignature, generatePrivateKey} from "nostr-tools"
  import MultiSelect from './MultiSelect.svelte'
  import {now, fromHex} from './util'
  import {draft, executor, privkey, pubkey} from './state'
  import {createRumor, createSeal, createGift, getConversationKey, decrypt} from './nip24'

  const send = async () => {
    const rumor = createRumor($pubkey, $draft)

    for (const key of $draft.recipients.concat($pubkey)) {
      const seal = createSeal($privkey, key, rumor)
      const gift = createGift(key, seal, $privkey)

      executor.publish(gift, {})
    }
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex gap-4">
    <label for="subject" class="label">Subject:</label>
    <input name="subject" class="input-default flex-grow" bind:value={$draft.subject} />
  </div>
  <div class="flex gap-4">
    <label for="recipients" class="label">Recipients:</label>
    <MultiSelect name="subject" bind:value={$draft.recipients} />
  </div>
  <textarea name="content" class="input-default h-20" bind:value={$draft.content} />
  <div class="flex justify-end">
    <button class="button1 padding" on:click={send}>Send Message</button>
  </div>
</div>
