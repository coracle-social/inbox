<script type="ts">
  export let value
  export let name = ""

  let input = ""

  const onKeyDown = event => {
    if (event.key === "Escape") {
      event.stopPropagation()
      input = ""
    }

    if (event.key === "Enter") {
      value = value.concat(input)
      input = ""
    }

    if (event.key === "Backspace" && !input) {
      value = value.slice(0, -1)
    }
  }

  const removeItem = item => {
    value = value.filter(v => v !== item)
  }
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
  <input class="input-default" bind:value={input} on:keydown={onKeyDown} {name} />
</div>
