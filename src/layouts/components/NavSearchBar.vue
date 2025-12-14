<script setup lang="ts">
import Shepherd from 'shepherd.js'
import { useDebounceFn } from '@vueuse/core'
import type { RouteLocationRaw } from 'vue-router'
import { useGlobalSearch, type SearchResults } from '@/composables/useGlobalSearch'
import { useConfigStore } from '@core/stores/config'
import { can } from '@layouts/plugins/casl'
import AppBarSearch from '@core/components/AppBarSearch.vue'

interface Suggestion {
  icon: string
  title: string
  url: RouteLocationRaw
  action?: string
  subject?: string
}

defineOptions({
  inheritAttrs: false,
})

const configStore = useConfigStore()
const { t } = useI18n({ useScope: 'global' })

// 👉 Global search composable
const { search, results: searchResults, isLoading: searchLoading, clearResults } = useGlobalSearch()

interface SuggestionGroup {
  title: string
  content: Suggestion[]
}

// 👉 Is App Search Bar Visible
const isAppSearchBarVisible = ref(false)

// 👉 Default suggestions

const suggestionGroups = computed<SuggestionGroup[]>(() => [
  {
    title: t('Quick Access'),
    content: [
      { icon: 'tabler-layout-dashboard', title: t('Dashboard'), url: { name: 'dashboard' } },
      { icon: 'tabler-ticket', title: t('Active Passes'), url: { name: 'apps-visitor-list' } },
      { icon: 'tabler-plus', title: t('Create Pass'), url: { name: 'apps-visitor-add' }, action: 'create', subject: 'visitor_pass' },
      { icon: 'tabler-list-check', title: t('Access Logs'), url: { name: 'apps-visitor-logs' } },
    ],
  },
  {
    title: t('Management'),
    content: [
      { icon: 'tabler-building-community', title: t('Communities'), url: { name: 'apps-community-list' } },
      { icon: 'tabler-home', title: t('Properties'), url: { name: 'apps-property-list' } },
      { icon: 'tabler-users', title: t('Users'), url: { name: 'apps-user-list' }, action: 'read', subject: 'users' },
      { icon: 'tabler-device-desktop', title: t('Devices'), url: { name: 'apps-devices-list' }, action: 'read', subject: 'automation' },
    ],
  },
])

// 👉 Filtered suggestions based on user permissions
const filteredSuggestionGroups = computed(() =>
  suggestionGroups.value.map(group => ({
    ...group,
    content: group.content.filter(item => can(item.action, item.subject)),
  })).filter(group => group.content.length > 0),
)

// 👉 No Data suggestion
const noDataSuggestions = computed<Suggestion[]>(() => [
  {
    title: t('Dashboard'),
    icon: 'tabler-layout-dashboard',
    url: { name: 'dashboard' },
  },
  {
    title: t('Communities'),
    icon: 'tabler-building-community',
    url: { name: 'apps-community-list' },
  },
  {
    title: t('Active Passes'),
    icon: 'tabler-ticket',
    url: { name: 'apps-visitor-list' },
  },
])

const searchQuery = ref('')

const router = useRouter()

// 👉 Filtered search results based on user permissions
const filteredSearchResults = computed(() => {
  if (!searchResults.value || !Array.isArray(searchResults.value)) {
    return []
  }

  // Filter each group's children based on CASL permissions
  return searchResults.value.map(group => {
    const filteredChildren = (group.children || []).filter(item => {
      // Items without action/subject defined are always visible
      if (!item.action && !item.subject) {
        return true
      }

      // Check CASL permission for items with action/subject
      return can(item.action, item.subject)
    })

    return {
      ...group,
      children: filteredChildren,
    }
  }).filter(group => group.children.length > 0)
})

// 👉 Debounced search function (300ms delay)
const debouncedSearch = useDebounceFn((query: string) => {
  search(query)
}, 300)

// Watch for search query changes
watch(searchQuery, query => {
  debouncedSearch(query)
})

const closeSearchBar = () => {
  isAppSearchBarVisible.value = false
  searchQuery.value = ''
  clearResults()
}

// 👉 redirect the selected page
const redirectToSuggestedPage = (selected: Suggestion) => {
  router.push(selected.url as string)
  closeSearchBar()
}

</script>

<template>
  <div
    class="d-flex align-center cursor-pointer"
    v-bind="$attrs"
    style="user-select: none;"
    @click="isAppSearchBarVisible = !isAppSearchBarVisible"
  >
    <!-- 👉 Search Trigger button -->
    <!-- close active tour while opening search bar using icon -->
    <IconBtn @click="Shepherd.activeTour?.cancel()">
      <VIcon icon="tabler-search" />
    </IconBtn>

    <span
      v-if="configStore.appContentLayoutNav === 'vertical'"
      class="d-none d-md-flex align-center text-disabled ms-2"
      @click="Shepherd.activeTour?.cancel()"
    >
      <span class="me-2">{{ t('Search') }}</span>
      <span class="meta-key">&#8984;K</span>
    </span>
  </div>

  <!-- 👉 App Bar Search -->
  <AppBarSearch
    v-model:is-dialog-visible="isAppSearchBarVisible"
    :search-results="filteredSearchResults"
    :is-loading="searchLoading"
    @search="searchQuery = $event"
  >
    <!-- suggestion -->
    <template #suggestions>
      <VCardText class="app-bar-search-suggestions pa-12">
        <VRow v-if="filteredSuggestionGroups">
          <VCol
            v-for="suggestion in filteredSuggestionGroups"
            :key="suggestion.title"
            cols="12"
            sm="6"
          >
            <p
              class="custom-letter-spacing text-disabled text-uppercase py-2 px-4 mb-0"
              style="font-size: 0.75rem; line-height: 0.875rem;"
            >
              {{ suggestion.title }}
            </p>
            <VList class="card-list">
              <VListItem
                v-for="item in suggestion.content"
                :key="item.title"
                class="app-bar-search-suggestion mx-4 mt-2"
                @click="redirectToSuggestedPage(item)"
              >
                <VListItemTitle>{{ item.title }}</VListItemTitle>
                <template #prepend>
                  <VIcon
                    :icon="item.icon"
                    size="20"
                    class="me-n1"
                  />
                </template>
              </VListItem>
            </VList>
          </VCol>
        </VRow>
      </VCardText>
    </template>

    <!-- no data suggestion -->
    <template #noDataSuggestion>
      <div class="mt-9">
        <span class="d-flex justify-center text-disabled mb-2">{{ t('Try searching for') }}</span>
        <h6
          v-for="suggestion in noDataSuggestions"
          :key="suggestion.title"
          class="app-bar-search-suggestion text-h6 font-weight-regular cursor-pointer py-2 px-4"
          @click="redirectToSuggestedPage(suggestion)"
        >
          <VIcon
            size="20"
            :icon="suggestion.icon"
            class="me-2"
          />
          <span>{{ suggestion.title }}</span>
        </h6>
      </div>
    </template>

    <!-- search result -->
    <template #searchResult="{ item }">
      <VListSubheader class="text-disabled custom-letter-spacing font-weight-regular ps-4">
        {{ item.title }}
      </VListSubheader>
      <VListItem
        v-for="list in item.children"
        :key="list.title"
        :to="list.url"
        @click="closeSearchBar"
      >
        <template #prepend>
          <VIcon
            size="20"
            :icon="list.icon"
            class="me-n1"
          />
        </template>
        <template #append>
          <VIcon
            size="20"
            icon="tabler-corner-down-left"
            class="enter-icon flip-in-rtl"
          />
        </template>
        <VListItemTitle>
          {{ list.title }}
        </VListItemTitle>
        <VListItemSubtitle v-if="list.subtitle">
          {{ list.subtitle }}
        </VListItemSubtitle>
      </VListItem>
    </template>
  </AppBarSearch>
</template>

<style lang="scss">
@use "@styles/variables/vuetify.scss";

.meta-key {
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  block-size: 1.5625rem;
  font-size: 0.8125rem;
  line-height: 1.3125rem;
  padding-block: 0.125rem;
  padding-inline: 0.25rem;
}

.app-bar-search-dialog {
  .custom-letter-spacing {
    letter-spacing: 0.8px;
  }

  .card-list {
    --v-card-list-gap: 8px;
  }
}
</style>
