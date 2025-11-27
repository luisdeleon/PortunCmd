<script setup lang="ts">
import QrcodeVue from 'qrcode.vue'

interface Props {
  value: string
  size?: number
  level?: 'L' | 'M' | 'Q' | 'H'
  background?: string
  foreground?: string
  renderAs?: 'canvas' | 'svg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 200,
  level: 'M',
  background: '#ffffff',
  foreground: '#000000',
  renderAs: 'canvas',
})

const emit = defineEmits<{
  (e: 'download'): void
}>()

const qrRef = ref<HTMLElement | null>(null)

const downloadQR = () => {
  const canvas = qrRef.value?.querySelector('canvas')
  if (canvas) {
    const link = document.createElement('a')
    link.download = `qr-code-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    emit('download')
  }
}

defineExpose({ downloadQR })
</script>

<template>
  <div
    ref="qrRef"
    class="qr-code-container d-flex flex-column align-center"
  >
    <QrcodeVue
      :value="value"
      :size="size"
      :level="level"
      :background="background"
      :foreground="foreground"
      :render-as="renderAs"
    />
    <slot name="actions">
      <VBtn
        variant="text"
        color="primary"
        size="small"
        class="mt-2"
        @click="downloadQR"
      >
        <VIcon
          icon="tabler-download"
          size="18"
          class="me-1"
        />
        Download
      </VBtn>
    </slot>
  </div>
</template>

<style scoped>
.qr-code-container {
  padding: 1rem;
  background: white;
  border-radius: 8px;
}
</style>
