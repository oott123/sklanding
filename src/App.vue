<script setup lang="ts">
import Main from './components/Main.vue'
</script>

<template>
  <n-message-provider>
    <n-loading-bar-provider>
      <n-dialog-provider>
        <Main></Main>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </n-message-provider>
</template>
