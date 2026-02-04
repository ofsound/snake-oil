import type { Ref } from 'vue';

export function useAudioContext(audioContext: AudioContext, isPlaying: Ref<boolean>, buffersAreLoaded: () => void) {

  audioContext.suspend()

  let sourceHasStarted = false

  let source = audioContext.createBufferSource()
  let audioBuffer: AudioBuffer = new AudioBuffer({
    numberOfChannels: 2,
    length: audioContext.sampleRate * 0.5,
    sampleRate: audioContext.sampleRate,
  })

  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 256

  const gainNode = audioContext.createGain()

  async function loadAudioBuffers(fileNames: Array<string>) {
    const buffers = await Promise.all(
      fileNames.map(async (file) => {
        try {
          const response = await fetch(`${file}`)
          const arrayBuffer = await response.arrayBuffer()
          return audioContext.decodeAudioData(arrayBuffer)
        } catch (error) {
          console.error(`Error loading or decoding ${file}:`, error)
          return null
        }
      }),
    )
    return buffers.filter((buffer) => buffer !== null)
  }

  let buffers: AudioBuffer[]

  const loadBuffers = async (fileNames: Array<string>) => {
    buffers = await loadAudioBuffers(fileNames)
    buffersAreLoaded()
  }

  const armAudio = (index: number) => {
    if (source && sourceHasStarted) {
      source.stop()
    }

    source = audioContext.createBufferSource()

    if (buffers[index]) {
      source.buffer = buffers[index]
      audioBuffer = buffers[index]
    }

    source.connect(gainNode).connect(analyser).connect(audioContext.destination)
  }

  const startAudio = () => {
    source.start(0)
    sourceHasStarted = true
    if (!isPlaying.value) {
      audioContext.resume()
    }
  }

  const togglePlayPause = () => {
    if (isPlaying.value) {
      audioContext.suspend()
    } else {
      audioContext.resume()
    }
  }
  const setSeekedAudio = (startOffset: number) => {
    if (source && sourceHasStarted) {
      source.stop()
    }
    source = audioContext.createBufferSource()
    source.buffer = audioBuffer
    source.connect(gainNode).connect(audioContext.destination)
    source.start(0, startOffset)
  }

  const handleAudioContextStateChange = () => {
    if (audioContext.state === 'running') {
      isPlaying.value = true
    } else {
      isPlaying.value = false
    }
  }

  audioContext.addEventListener('statechange', handleAudioContextStateChange)

  const getDuration = (): number => {
    return audioBuffer.duration
  }

  const getCurrentTime = (): number => {
    return audioContext.currentTime
  }

  const getAnalyser = (): AnalyserNode => {
    return analyser
  }

  const setGain = (newGain: number) => {
    gainNode.gain.value = newGain
  }


  return {
    loadBuffers,
    armAudio,
    startAudio,
    togglePlayPause,
    setSeekedAudio,
    getAnalyser,
    getDuration,
    getCurrentTime,
    setGain,
  }
}
