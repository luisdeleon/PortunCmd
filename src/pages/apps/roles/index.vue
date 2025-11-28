<script setup lang="ts">
import RoleCards from '@/views/apps/roles/RoleCards.vue'
import PermissionMatrix from '@/views/apps/roles/PermissionMatrix.vue'
import UserList from '@/views/apps/roles/UserList.vue'

const { t } = useI18n({ useScope: 'global' })

definePage({
  meta: {
    public: false, // Requires authentication
  },
})

const currentTab = ref('roles')
</script>

<template>
  <VRow>
    <VCol cols="12">
      <h4 class="text-h4 mb-1">
        {{ t('rolesList.title') }}
      </h4>
      <p class="text-body-1 mb-0">
        {{ t('rolesList.description') }}
      </p>
    </VCol>

    <!-- 👉 Tabs -->
    <VCol cols="12">
      <VTabs v-model="currentTab">
        <VTab value="roles">
          <VIcon
            start
            icon="tabler-crown"
          />
          {{ t('rolesList.tabs.roleCards') }}
        </VTab>
        <VTab value="matrix">
          <VIcon
            start
            icon="tabler-table"
          />
          {{ t('rolesList.tabs.permissionMatrix') }}
        </VTab>
        <VTab value="users">
          <VIcon
            start
            icon="tabler-users"
          />
          {{ t('rolesList.tabs.userAssignments') }}
        </VTab>
      </VTabs>
    </VCol>

    <!-- 👉 Tab Content -->
    <VCol cols="12">
      <VWindow v-model="currentTab">
        <!-- Role Cards Tab -->
        <VWindowItem value="roles">
          <RoleCards />
        </VWindowItem>

        <!-- Permission Matrix Tab -->
        <VWindowItem value="matrix">
          <PermissionMatrix />
        </VWindowItem>

        <!-- Users Tab -->
        <VWindowItem value="users">
          <h4 class="text-h4 mb-1 mt-2">
            {{ t('rolesList.totalUsers') }}
          </h4>
          <p class="text-body-1 mb-6">
            {{ t('rolesList.usersDescription') }}
          </p>
          <UserList />
        </VWindowItem>
      </VWindow>
    </VCol>
  </VRow>
</template>
