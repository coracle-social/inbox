<script lang="ts">
  export let name
  export let picture
</script>

<div class="flex gap-2 items-center">
  <div
    class={`overflow-hidden w-8 h-8 inline-block shrink-0 rounded-full border
            border-solid border-blue-100 bg-cover bg-center`}
    style={`background-image: url(${picture})`}>
    <slot />
  </div>
  <div class="text-xl">{name}</div>
</div>
