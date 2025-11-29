<script setup lang="ts">
import { supabase } from '@/lib/supabase'

const { t } = useI18n({ useScope: 'global' })

interface CountryData {
  country: string
  count: number
  percentage: number
  flag: string
}

const countriesData = ref<CountryData[]>([])
const isLoading = ref(false)
const totalCommunities = ref(0)

// Country flag emoji mapping
const countryFlags: Record<string, string> = {
  'Guatemala': '🇬🇹',
  'Mexico': '🇲🇽',
  'El Salvador': '🇸🇻',
  'United States': '🇺🇸',
  'Brazil': '🇧🇷',
  'Honduras': '🇭🇳',
  'Costa Rica': '🇨🇷',
  'Panama': '🇵🇦',
  'Nicaragua': '🇳🇮',
  'Colombia': '🇨🇴',
  'Argentina': '🇦🇷',
  'Chile': '🇨🇱',
  'Peru': '🇵🇪',
  'Spain': '🇪🇸',
}

const fetchCommunitiesByCountry = async () => {
  try {
    isLoading.value = true

    // Fetch all communities with their country
    const { data, error } = await supabase
      .from('community')
      .select('country')

    if (error) {
      console.error('Error fetching communities:', error)
      return
    }

    if (!data || data.length === 0) {
      countriesData.value = []
      totalCommunities.value = 0
      return
    }

    // Count communities by country
    const countryCount: Record<string, number> = {}
    data.forEach(community => {
      const country = community.country || 'Unknown'
      countryCount[country] = (countryCount[country] || 0) + 1
    })

    totalCommunities.value = data.length

    // Convert to array and calculate percentages
    const result: CountryData[] = Object.entries(countryCount)
      .map(([country, count]) => ({
        country,
        count,
        percentage: Number(((count / data.length) * 100).toFixed(1)),
        flag: countryFlags[country] || '🏳️',
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending

    countriesData.value = result
  } catch (err) {
    console.error('Error in fetchCommunitiesByCountry:', err)
  } finally {
    isLoading.value = false
  }
}

const refreshData = () => {
  fetchCommunitiesByCountry()
}

const moreList = computed(() => [
  { title: t('Refresh'), value: 'refresh' },
])

const handleMenuClick = (action: string) => {
  if (action === 'refresh') {
    refreshData()
  }
}

onMounted(() => {
  fetchCommunitiesByCountry()
})
</script>

<template>
  <VCard
    :title="t('dashboard.communitiesByCountry')"
    :subtitle="t('dashboard.distributionOverview')"
  >
    <template #append>
      <div class="d-flex align-center mt-n4 me-n2">
        <IconBtn
          :to="{ name: 'apps-community-list' }"
          color="primary"
          variant="text"
        >
          <VIcon
            icon="tabler-external-link"
            size="22"
          />
          <VTooltip
            activator="parent"
            location="top"
          >
            View Communities
          </VTooltip>
        </IconBtn>
        <MoreBtn
          size="small"
          :menu-list="moreList"
          @click:item="handleMenuClick($event.value)"
        />
      </div>
    </template>

    <VCardText>
      <div
        v-if="isLoading"
        class="d-flex justify-center py-4"
      >
        <VProgressCircular
          indeterminate
          color="primary"
        />
      </div>

      <VList
        v-else
        class="card-list"
      >
        <VListItem
          v-for="country in countriesData"
          :key="country.country"
        >
          <template #prepend>
            <VAvatar
              size="40"
              class="me-1 flag-avatar"
            >
              <span class="flag-emoji">{{ country.flag }}</span>
            </VAvatar>
          </template>

          <VListItemTitle class="font-weight-medium">
            {{ country.country }}
          </VListItemTitle>
          <VListItemSubtitle>
            {{ country.count }} {{ country.count === 1 ? t('community') : t('communities') }}
          </VListItemSubtitle>

          <template #append>
            <div class="d-flex align-center">
              <VProgressLinear
                :model-value="country.percentage"
                color="primary"
                rounded
                height="6"
                style="min-inline-size: 80px;"
                class="me-3"
              />
              <span class="text-body-1 font-weight-medium" style="min-inline-size: 50px; text-align: end;">
                {{ country.percentage }}%
              </span>
            </div>
          </template>
        </VListItem>

        <VListItem v-if="countriesData.length === 0 && !isLoading">
          <VListItemTitle class="text-center text-disabled">
            {{ t('dashboard.noCommunitiesFound') }}
          </VListItemTitle>
        </VListItem>
      </VList>

      <!-- Total Summary -->
      <VDivider
        v-if="countriesData.length > 0"
        class="my-4"
      />
      <div
        v-if="countriesData.length > 0"
        class="d-flex justify-space-between align-center"
      >
        <span class="text-body-1 text-medium-emphasis">
          {{ t('dashboard.totalCommunities') }}
        </span>
        <VChip
          color="primary"
          size="small"
          label
        >
          {{ totalCommunities }}
        </VChip>
      </div>
    </VCardText>
  </VCard>
</template>

<style lang="scss" scoped>
.card-list {
  --v-card-list-gap: 1rem;
}

.flag-avatar {
  overflow: hidden;
  background: transparent;
}

.flag-emoji {
  font-size: 2.5rem;
  line-height: 1;
  transform: scale(1.4);
}
</style>
