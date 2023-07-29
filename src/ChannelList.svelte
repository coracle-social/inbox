<script lang="ts">
  import {without} from "ramda"
  import {derived} from "svelte/store"
  import PersonBadge from "./PersonBadge.svelte"
  import {draft, pubkey, channels, contacts, getName, getPicture} from "./state"

  const updatedChannels = derived([channels, contacts], ([$channels]) => $channels)

  const openChannel = channel => {
    draft.set({
      subject: channel.subject,
      recipients: without([$pubkey], channel.pubkeys),
      content: "",
    })
  }
</script>

<div class="flex flex-col gap-4 py-2">
  {#each $updatedChannels as channel}
    <div
      class="grid grid-cols-3 gap-4 card-default padding pb-0 cursor-pointer hover:bg-gray-100 transition-colors"
      on:click={() => openChannel(channel)}>
      <h3 class="text-2xl">{channel.subject || "No subject"}</h3>
      <div class="border-l border-solid border-blue-100 col-span-2 px-2 -mt-2">
        {#each channel.pubkeys as k}
          <div class="inline-block mr-4 my-2">
            <PersonBadge name={getName($contacts, k)} picture={getPicture($contacts, k)} />
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
