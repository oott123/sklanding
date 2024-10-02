<script setup lang="ts">
import Main from './components/Main.vue'
</script>

<template>
  <n-message-provider>
    <n-loading-bar-provider>
      <n-modal-provider>
        <n-dialog-provider>
          <Main></Main>
        </n-dialog-provider>
      </n-modal-provider>
    </n-loading-bar-provider>
  </n-message-provider>
</template>
