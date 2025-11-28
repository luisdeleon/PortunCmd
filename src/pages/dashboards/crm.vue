<script setup lang="ts">
// CRM dashboard is disabled - redirect to main PortunCmd dashboard
definePage({
  meta: {
    layout: 'default',
    public: false,
  },
})

const router = useRouter()

onMounted(() => {
  router.replace('/dashboard')
})
</script>

<template>
  <div class="d-flex align-center justify-center" style="min-height: 200px;">
    <VProgressCircular indeterminate color="primary" />
  </div>
</template>
