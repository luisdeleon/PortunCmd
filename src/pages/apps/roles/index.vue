<script setup lang="ts">
import RoleCards from '@/views/apps/roles/RoleCards.vue'
import PermissionMatrix from '@/views/apps/roles/PermissionMatrix.vue'
import UserList from '@/views/apps/roles/UserList.vue'

const currentTab = ref('roles')
</script>

<template>
  <VRow>
    <VCol cols="12">
      <h4 class="text-h4 mb-1">
        Roles List
      </h4>
      <p class="text-body-1 mb-0">
        A role provided access to predefined menus and features so that depending on assigned role an administrator can have access to what he need
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
          Role Cards
        </VTab>
        <VTab value="matrix">
          <VIcon
            start
            icon="tabler-table"
          />
          Permission Matrix
        </VTab>
        <VTab value="users">
          <VIcon
            start
            icon="tabler-users"
          />
          User Assignments
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
            Total users with their roles
          </h4>
          <p class="text-body-1 mb-6">
            Find all of your company's administrator accounts and their associate roles.
          </p>
          <UserList />
        </VWindowItem>
      </VWindow>
    </VCol>
  </VRow>
</template>
