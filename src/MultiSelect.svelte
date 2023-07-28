<script type="ts">
  import {identity} from "ramda"

  export let value
  export let name = ""
  export let search
  export let toValue = identity

  let input = ""
  let element

  const onKeyDown = event => {
    if (event.key === "Escape") {
      event.stopPropagation()
      input = ""
    }

    if (event.key === "Backspace" && !input) {
      value = value.slice(0, -1)
    }
  }

  const removeItem = item => {
    value = value.filter(v => v !== item)
  }

  const select = item => {
    value = value.concat(toValue(item))
    input = ""
    element.focus()
  }

  $: suggestions = search(input)
</script>

<div>
  {#each value as item}
    <div class="padding button1 mr-1 mb-1 inline-block">
      <i class="fa fa-times cursor-pointer" on:click={() => removeItem(item)} />
      <slot name="item" context="value" {item}>
        {item}
      </slot>
    </div>
  {/each}
  <input
    type="text"
    autocomplete="off"
    class="input-default"
    bind:this={element}
    bind:value={input}
    on:keydown={onKeyDown}
    {name} />
  {#if input && suggestions.length > 0}
    <div class="relative">
      <div class="absolute flex flex-col gap-2 card-default bg-white mt-1">
        {#each suggestions as item}
          <div class="padding hover:bg-blue-100 cursor-pointer" on:click={() => select(item)}>
            <slot name="item" context="option" {item}>
              {item}
            </slot>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
