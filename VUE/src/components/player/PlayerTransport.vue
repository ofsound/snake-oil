<script setup lang="ts">
defineProps<{
  isPlaying: boolean
}>()
const emit = defineEmits(['transportClicked'])
</script>

<template>
  <div class="flex h-2/3 justify-center gap-2">
    <button
      class="mt-1 aspect-square max-h-7/8 cursor-pointer rounded-full bg-linear-to-t from-sky-600 to-indigo-300 px-3 py-1 text-sm font-black hover:bg-gray-400"
      @click="emit('transportClicked', 'prev')"
    >
      &#9664;
    </button>
    <button
      class="relative block aspect-square cursor-pointer rounded-full bg-linear-to-t from-sky-600 to-indigo-300 px-3 hover:bg-gray-400"
      @click="emit('transportClicked', 'playPause')"
    >
      <svg
        v-if="!isPlaying"
        xmlns="http://www.w3.org/2000/svg"
        class="absolute top-[15px] right-0 left-1 mr-auto ml-auto h-6 w-6"
        viewBox="0 0 512 512"
      >
        <path
          d="M133 440a35.37 35.37 0 01-17.5-4.67c-12-6.8-19.46-20-19.46-34.33V111c0-14.37 7.46-27.53 19.46-34.33a35.13 35.13 0 0135.77.45l247.85 148.36a36 36 0 010 61l-247.89 148.4A35.5 35.5 0 01133 440z"
        />
      </svg>
      <svg
        v-if="isPlaying"
        xmlns="http://www.w3.org/2000/svg"
        class="absolute top-[15.5px] right-0 left-0 mr-auto ml-auto h-6 w-6"
        viewBox="0 0 512 512"
      >
        <path
          d="M208 432h-48a16 16 0 01-16-16V96a16 16 0 0116-16h48a16 16 0 0116 16v320a16 16 0 01-16 16zM352 432h-48a16 16 0 01-16-16V96a16 16 0 0116-16h48a16 16 0 0116 16v320a16 16 0 01-16 16z"
        />
      </svg>
    </button>
    <button
      class="mt-1 aspect-square max-h-7/8 cursor-pointer rounded-full bg-linear-to-t from-sky-600 to-indigo-300 px-3 py-1 text-sm hover:bg-gray-400"
      @click="emit('transportClicked', 'next')"
    >
      &#9654;
    </button>
  </div>
</template>
