<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDialog, useLoadingBar, useMessage } from 'naive-ui'

const message = useMessage()
const loadingBar = useLoadingBar()
const dialog = useDialog()
const cred = ref(localStorage.sklandCred ?? '')
const step = ref(1)
const isLoading = ref(false)

function wrap<T extends any[]>(cb: (...args: T) => Promise<any>) {
  return async (...args: T) => {
    try {
      loadingBar.start()
      isLoading.value = true
      await cb(...args)
      loadingBar.finish()
    } catch (e: any) {
      loadingBar.error()
      message.error(e.message ?? e)
    } finally {
      isLoading.value = false
    }
  }
}
function handleSkLand(data: any) {
  if (data.code === 0) {
    return data.data
  } else {
    throw new Error(data.message)
  }
}

const bindings = ref([] as Array<{ channelName: string; nickName: string; uid: string; isDefault: boolean }>)

const getBindingList = wrap(async () => {
  const res = await fetch('https://zonai.skland.com/api/v1/game/player/binding', {
    headers: {
      Cred: cred.value,
    },
  })
  const data = handleSkLand(await res.json())
  localStorage.sklandCred = cred.value
  bindings.value = data.list.find((x: any) => x.appCode === 'arknights')?.bindingList ?? []
  step.value = 2
})

const info = ref<any>(null)

const getInfo = wrap(async (uid: string) => {
  const res = await fetch(`https://zonai.skland.com/api/v1/game/player/info?uid=${uid}`, {
    headers: {
      Cred: cred.value,
    },
  })
  const data = handleSkLand(await res.json())
  info.value = data
  step.value = 3
})

const copyInfo = wrap(async () => {
  await navigator.clipboard.writeText(JSON.stringify(info.value))
  message.success('复制成功')
})

const search = new URLSearchParams(location.search)
const origin = search.get('origin')
const appName = search.get('appName') ?? ''
const postInfo = function () {
  const dlg = dialog.warning({
    title: '授权应用',
    content: `位于 ${origin} 的应用 ${appName} 正在请求授权，此应用将获取你所提取的角色信息。`,
    positiveText: '好的，授权给它',
    negativeText: '不，我只是点错了',
    onPositiveClick() {
      if (!window.opener) {
        dialog.error({
          title: '无法找到授权应用',
          content: `位于 ${origin} 的应用 ${appName} 想请求授权，但当前窗口并非由该应用打开。如果您是应用 ${appName} 的开发者，请确保打开窗口时没有传入 noopener 参数。`,
          positiveText: '哦，好吧',
        })
      } else {
        window.opener?.postMessage(
          { version: 1, from: 'sklanding', type: 'arknights', data: JSON.parse(JSON.stringify(info.value)) },
          origin,
        )
        message.success('已将角色信息发送给应用')
      }
      dlg.destroy()
    },
  })
}
</script>

<template>
  <n-layout>
    <n-layout-header>
      <h2><n-gradient-text type="success">森空岛数据提取装置</n-gradient-text></h2>
    </n-layout-header>
    <n-layout has-sider>
      <n-layout-sider content-style="padding: 24px;">
        <n-steps vertical v-model:current="step" :status="isLoading ? 'wait' : 'process'">
          <n-step title="登录" description="获取鉴权凭据" />
          <n-step title="角色" description="选择提取角色" />
          <n-step title="提取" description="提取干员信息" />
        </n-steps>
      </n-layout-sider>
      <n-layout-content content-style="padding: 24px;">
        <div v-if="step == 1">
          <n-space vertical>
            <n-alert title="获取森空岛鉴权凭据" type="info">
              打开<a href="https://www.skland.com" target="_blank">森空岛</a>并登录，在控制台中输入
              <n-code
                code="copy(localStorage.SK_OAUTH_CRED_KEY);"
                language="javascript"
                inline
              />，然后在下方输入框中按粘贴。
            </n-alert>
            <div></div>
            <n-form-item label="鉴权凭据">
              <n-input v-model:value="cred" type="password" placeholder="粘贴到这里"></n-input>
            </n-form-item>
            <n-button type="primary" @click="getBindingList" :loading="isLoading">下一步</n-button>
          </n-space>
        </div>
        <div v-if="step == 2">
          <n-space vertical>
            <n-spin :show="isLoading">
              <n-empty v-if="bindings.length <= 0" size="huge" description="该帐号下没有角色">
                <template #extra>
                  <n-button @click="step = 1">上一步</n-button>
                </template>
              </n-empty>
              <n-list hoverable clickable>
                <n-list-item v-for="binding in bindings" :key="binding.uid" @click="getInfo(binding.uid)">
                  <n-thing :title="binding.nickName">
                    <template #description>
                      <n-space>
                        <n-tag type="info">{{ binding.channelName }}</n-tag>
                        <n-tag type="success" v-if="binding.isDefault">默认</n-tag>
                        <n-tag>UID: {{ binding.uid }}</n-tag>
                      </n-space>
                    </template>
                  </n-thing>
                </n-list-item>
              </n-list>
            </n-spin>
          </n-space>
        </div>
        <div v-if="step == 3">
          <n-space vertical>
            <n-input :value="JSON.stringify(info)" type="textarea" rows="8" readonly />
            <n-space>
              <n-button type="primary" @click="copyInfo">复制</n-button>
              <n-button v-if="origin" @click="postInfo">授权给{{ appName }}</n-button>
            </n-space>
          </n-space>
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<style scoped>
.n-layout-header {
  padding: 0 24px;
}

.n-layout-footer {
  padding: 24px;
}
</style>
