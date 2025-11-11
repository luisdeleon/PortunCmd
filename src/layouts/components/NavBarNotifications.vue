<script lang="ts" setup>
import type { Notification } from '@layouts/types'

import avatar3 from '@images/avatars/avatar-3.png'
import avatar4 from '@images/avatars/avatar-4.png'
import avatar5 from '@images/avatars/avatar-5.png'
import paypal from '@images/cards/paypal-rounded.png'

const { t } = useI18n({ useScope: 'global' })

const notifications = computed<Notification[]>(() => [
  {
    id: 1,
    img: avatar4,
    title: t('Congratulation Flora! 🎉'),
    subtitle: t('Won the monthly best seller badge'),
    time: t('Today'),
    isSeen: true,
  },
  {
    id: 2,
    text: 'Tom Holland',
    title: t('New user registered.'),
    subtitle: '5 hours ago',
    time: t('Yesterday'),
    isSeen: false,
  },
  {
    id: 3,
    img: avatar5,
    title: t('New message received 👋🏻'),
    subtitle: t('You have 10 unread messages'),
    time: t('11 Aug'),
    isSeen: true,
  },
  {
    id: 4,
    img: paypal,
    title: t('PayPal'),
    subtitle: t('Received Payment'),
    time: t('25 May'),
    isSeen: false,
    color: 'error',
  },
  {
    id: 5,
    img: avatar3,
    title: t('Received Order 📦'),
    subtitle: t('New order received from john'),
    time: t('19 Mar'),
    isSeen: true,
  },
])

const removeNotification = (notificationId: number) => {
  notifications.value.forEach((item, index) => {
    if (notificationId === item.id)
      notifications.value.splice(index, 1)
  })
}

const markRead = (notificationId: number[]) => {
  notifications.value.forEach(item => {
    notificationId.forEach(id => {
      if (id === item.id)
        item.isSeen = true
    })
  })
}

const markUnRead = (notificationId: number[]) => {
  notifications.value.forEach(item => {
    notificationId.forEach(id => {
      if (id === item.id)
        item.isSeen = false
    })
  })
}

const handleNotificationClick = (notification: Notification) => {
  if (!notification.isSeen)
    markRead([notification.id])
}
</script>

<template>
  <Notifications
    :notifications="notifications"
    @remove="removeNotification"
    @read="markRead"
    @unread="markUnRead"
    @click:notification="handleNotificationClick"
  />
</template>
