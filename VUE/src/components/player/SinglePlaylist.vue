<script setup lang="ts">
const props = defineProps<{
  currentIndex: number
  titles: string[]
}>()

const emit = defineEmits(['trackClicked'])

const isArmed = (index: number): string => {
  if (props.currentIndex === index) {
    return ''
  } else {
    return 'bg-[repeating-linear-gradient(45deg,_#e1e1e1_0,_#e1e1e1_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed text-gray-400'
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="absolute z-0 flex h-full w-full flex-col bg-gray-100 p-30">
      <a
        href="#"
        class="block border-b-1 border-gray-400 px-1 py-2 hover:bg-gray-200"
        v-for="(title, index) in titles"
        :key="title"
        :class="isArmed(index)"
        @click="emit('trackClicked', index)"
      >
        <span class="mr-1 text-xs font-bold">{{ index + 1 }}.</span> {{ title }}
      </a>
    </div>
  </Teleport>
</template>
