<script setup lang="ts">
interface Props {
  status: string
  entityType?: 'user' | 'community' | 'property'
  size?: 'x-small' | 'small' | 'default' | 'large' | 'x-large'
  showIcon?: boolean
  clickable?: boolean
}

interface Emits {
  (e: 'click'): void
}

const props = withDefaults(defineProps<Props>(), {
  entityType: 'user',
  size: 'small',
  showIcon: true,
  clickable: true,
})

const emit = defineEmits<Emits>()

// Get status utilities
const { getStatusColor, getStatusIcon, formatStatus } = useStatus()

const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}
</script>

<template>
  <VChip
    :color="getStatusColor(status)"
    :prepend-icon="showIcon ? getStatusIcon(status) : undefined"
    :size="size"
    variant="tonal"
    :class="{ 'cursor-pointer': clickable }"
    @click="handleClick"
  >
    {{ formatStatus(status) }}
  </VChip>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
