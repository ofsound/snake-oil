<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'

const props = defineProps<{
  analyser: AnalyserNode
}>()

const bufferLength = props.analyser.frequencyBinCount
const dataArray = new Uint8Array(bufferLength)

let drawVisual = -1

const canvas = useTemplateRef('myCanvas')

onMounted(() => {
  if (canvas.value) {
    const canvasCtx = canvas.value.getContext('2d')

    if (canvasCtx) {
      canvasCtx.clearRect(0, 0, 150, 150)
    }

    function draw() {
      drawVisual = requestAnimationFrame(draw)

      props.analyser.getByteTimeDomainData(dataArray)

      if (canvasCtx) {
        canvasCtx.fillStyle = 'rgb(200 200 200)'
        canvasCtx.fillRect(0, 0, 150, 150)

        canvasCtx.lineWidth = 2
        canvasCtx.strokeStyle = 'rgb(0 0 0)'
        canvasCtx.beginPath()

        const sliceWidth = 150 / bufferLength
        let x = 0
        for (let i = 0; i < bufferLength; i++) {
          const thisDataArray = dataArray[i]

          if (thisDataArray) {
            const v = thisDataArray / 128.0
            const y = v * (150 / 2)

            if (i === 0) {
              canvasCtx.moveTo(x, y)
            } else {
              canvasCtx.lineTo(x, y)
            }

            x += sliceWidth
          }
        }

        canvasCtx.lineTo(150, 150 / 2)
        canvasCtx.stroke()
      }
    }
    draw()
  }
})
onUnmounted(() => {
  cancelAnimationFrame(drawVisual)
})
</script>

<template>
  <canvas ref="myCanvas" width="150" height="150"></canvas>
</template>
