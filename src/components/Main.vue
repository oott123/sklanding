<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { c, useDialog, useLoadingBar, useMessage } from 'naive-ui'
import { signSkLand } from '@/utils/sign'

const message = useMessage()
const loadingBar = useLoadingBar()
const dialog = useDialog()

const yjPassToken = ref(localStorage.yjPassToken ?? '')
const skLandCred = ref('')
const skLandToken = ref('')

const step = ref(1)
const isLoading = ref(false)

const predefinedScopes = [
  { path: `status.uid`, desc: '玩家 UID', class: 'asdfghjkl' },
  { path: `status.name`, desc: '博士名称', class: 'asdfghjkl' },
  { path: `status.secretary`, desc: '助理角色' },
  { path: `status.registerTs`, desc: '注册时间' },
  { path: `status.subscriptionEnd`, desc: '月卡到期时间' },
  { path: `status.lastOnlineTs`, desc: '上次在线时间' },
  { path: `status.ap`, desc: '理智信息' },
  { path: `assistChars`, desc: '助战干员信息' },
  { path: `chars`, desc: '干员列表及其练度、信赖值、获得时间等' },
  { path: `skins`, desc: '皮肤列表及其获得时间' },
  { path: `building`, desc: '基建布局及工作中的干员信息' },
  { path: `recruit`, desc: '公开招募状态' },
  { path: `campaign`, desc: '剿灭作战纪录' },
  { path: `tower`, desc: '保全派驻纪录' },
  { path: `rogue`, desc: '集成战略纪录' },
  { path: `routine`, desc: '日常任务状态' },
  { path: `activity`, desc: '活动关卡纪录' },
  { path: `charAssets`, desc: '公开展示的干员列表' },
  { path: `skinAssets`, desc: '公开展示的皮肤列表' },
]

function getPath(obj: any, path: string) {
  const keys = path.split('.')
  let cur: any = obj
  for (const key of keys) {
    if (cur == null) return undefined
    if (Array.isArray(cur)) return undefined
    if (typeof cur !== 'object') return undefined
    if (!Object.prototype.hasOwnProperty.call(cur, key)) return undefined
    cur = cur[key]
  }
  return cur
}

function setPath(obj: any, path: string, value: any) {
  const keys = path.split('.')
  let cur: any = obj
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if (cur == null) return
    if (Array.isArray(cur)) return
    if (typeof cur !== 'object') return
    if (!Object.prototype.hasOwnProperty.call(cur, key) && Reflect.has(cur, key)) return
    if (i === keys.length - 1) {
      cur[key] = value
      return
    } else {
      if (cur[key] == null) {
        cur[key] = Object.create(null)
      }
      cur = cur[key]
    }
  }
}

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

async function fetchSkLand(path: string, cred: string, token: string, body?: any) {
  const res = await fetch(`https://zonai.skland.com${path}`, {
    ...(body
      ? {
          body: JSON.stringify(body),
          method: 'POST',
        }
      : {}),
    headers: {
      Cred: cred,
      ...(await signSkLand(path, token)),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
  })

  return handleSkLand(await res.json())
}

const bindings = ref([] as Array<{ channelName: string; nickName: string; uid: string; isDefault: boolean }>)

const getBindingList = wrap(async () => {
  let passToken = yjPassToken.value
  if (passToken.length > 24) {
    passToken.match(/"([^"]{24})"/)[1]
  }

  const grant = await (
    await fetch('/api/proxy', {
      method: 'POST',
      body: JSON.stringify({
        token: passToken,
        appCode: '4ca99fa6b56cc2ba',
        type: 0,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  ).json()

  if (grant.status !== 0) {
    throw new Error(`登录森空岛失败： ${grant.msg}`)
  }

  const { cred, token } = await fetchSkLand('/api/v1/user/auth/generate_cred_by_code', '', '', {
    code: grant.data.code,
    kind: 1,
  })
  skLandCred.value = cred
  skLandToken.value = token

  localStorage.yjPassToken = passToken
  if (localStorage.sklandCred) {
    localStorage.removeItem('sklandCred')
  }

  const data = await fetchSkLand('/api/v1/game/player/binding', cred, token)
  bindings.value = data.list.find((x: any) => x.appCode === 'arknights')?.bindingList ?? []
  step.value = 2
})

const info = ref<any>(null)
const filename = ref<string>('arknights-dump.json')

const filteredInfo = ref<any>(null)
const filteredScopes = ref<typeof predefinedScopes>([])

const getInfo = wrap(async (uid: string) => {
  const data = await fetchSkLand(`/api/v1/game/player/info?uid=${uid}`, skLandCred.value, skLandToken.value)
  info.value = data
  filename.value = 'arknights-dump.json'
  try {
    const ts = data.currentTs
    const uid = data.status?.uid
    const name = data.status?.name
    filename.value = `arknights-dump-${uid}-${name}-${ts}.json`
  } catch {}

  {
    const source = JSON.parse(JSON.stringify(info.value))
    if (scopes) {
      const target = Object.create(null)
      target.currentTs = source.currentTs
      for (const scope of scopes) {
        const value = getPath(source, scope)
        if (value === undefined) continue
        setPath(target, scope, value)
      }
      filteredInfo.value = target
      filteredScopes.value = predefinedScopes.filter((scope) => {
        const value = getPath(target, scope.path)
        return value !== undefined
      })
    } else {
      filteredInfo.value = source
      filteredScopes.value = predefinedScopes
    }
  }
  step.value = 3
})

const copyInfo = wrap(async () => {
  await navigator.clipboard.writeText(JSON.stringify(info.value))
  message.success('复制成功')
})

const search = new URLSearchParams(location.search)
const origin = search.get('origin')
const appName = search.get('appName') ?? ''
const rawScopes = search.get('scopes') ?? ''
const scopes = rawScopes ? [...new Set(rawScopes.split(','))] : null
const postInfo = function () {
  const render = () => {
    return h('div', {}, [
      `位于 ${origin} 的应用 ${appName} 正在请求授权，此应用将获取你所提取的角色信息${
        scopes ? '的一部分' : ''
      }，包括但可能不限于以下信息，请注意保护您的隐私。`,
      h('ul', { class: 'x-scopes' }, [
        ...filteredScopes.value.map((item) => {
          return h('li', { class: item.class }, [item.desc, ` `, h('code', {}, `${item.path}`)])
        }),
      ]),
    ])
  }
  const dlg = dialog.warning({
    title: '授权应用',
    content: render,
    positiveText: '好的，授权给它',
    negativeText: '不，我只是点错了',
    onPositiveClick() {
      if (!window.opener) {
        dialog.error({
          title: '无法找到授权应用',
          content: `位于 ${origin} 的应用 ${appName} 想请求授权，但当前窗口并非由该应用打开。如果您是应用 ${appName} 的开发者，请确保打开窗口时没有传入 noopener 参数。`,
          positiveText: '哦，好吧',
        })
        console.log('data to be posted', JSON.stringify(filteredInfo.value))
      } else {
        window.opener?.postMessage(
          { version: 1, from: 'sklanding', type: 'arknights', data: JSON.parse(JSON.stringify(filteredInfo.value)) },
          origin,
        )
        message.success('已将角色信息发送给应用')
      }
      dlg.destroy()
    },
  })
}

onMounted(() => {
  if (localStorage.sklandCred) {
    localStorage.sklandCred = '***'
    dialog.warning({
      title: '改版提醒',
      content: '由于森空岛改版，提取操作已经发生改变。请重新按照网页的新方法操作。',
      positiveText: '知道了，我会看的',
    })
  }
})
</script>

<template>
  <n-layout>
    <n-layout-header>
      <h2><n-gradient-text type="success">森空岛数据提取装置</n-gradient-text></h2>
    </n-layout-header>
    <n-layout>
      <n-layout-header>
        <n-steps v-model:current="step" :status="isLoading ? 'wait' : 'process'" style="padding: 12px 0">
          <n-step title="登录" />
          <n-step title="角色" />
          <n-step title="提取" />
        </n-steps>
      </n-layout-header>
      <n-layout-content content-style="padding: 24px;">
        <div v-if="step == 1">
          <n-space vertical>
            <n-alert title="操作前请先阅读" type="warning">
              请注意，本站会帮助您使用您的「鹰角网络通行证账号的登录凭证」读取数据，并<strong class="red"
                >将其发送到 Vercel 边缘计算函数中</strong
              >。
              <br />
              <strong class="red">
                通过该凭证以及技术手段，不仅可以登录森空岛，还可以登录您的明日方舟帐号及鹰角网络所属的其它游戏，请确保信任本站及
                Vercel 再操作！
              </strong>
              <strong>我们强烈建议您在操作前仔细阅读源码，或自行部署！</strong>
              <br />
              尽管目前尚未有任何该行为引发的处罚、处理，但该行为仍然违反《森空岛使用许可及服务协议》和《鹰角网络游戏使用许可及服务协议》。
              <br />
              为了方便您后续更新数据，本站会将您的「鹰角网络通行证账号的登录凭证」保存到本地存储中。
              <br />
              本站亦不会采集或存储任何您的其它数据。
            </n-alert>
            <div></div>
            <n-alert title="我们如何保护您的数据" type="success">
              <ol>
                <li>本站源码完全开放，可以自行验证所有代码逻辑</li>
                <li>
                  本站在 Vercel 平台进行公开部署，可通过
                  <a href="/_src" target="_blank">/_src</a> 直接查看第三方托管源代码
                </li>
                <li>本站使用 CSP 技术防止数据意外传输到第三方</li>
              </ol>
            </n-alert>
            <div></div>
            <n-alert title="如何获取鹰角通行证凭证" type="info">
              <ol>
                <li>
                  打开
                  <a href="https://ak.hypergryph.com/user" target="_blank" rel="noopener noreferer">官网</a>
                  并登录
                </li>
                <li>
                  打开
                  <a href="https://web-api.hypergryph.com/account/info/hg" target="_blank" rel="noopener noreferer"
                    >通行证凭证</a
                  >
                  阅读警告并复制所有内容
                </li>
                <li>粘贴到下方</li>
              </ol>
            </n-alert>
            <div></div>
            <n-form-item label="通行证凭证">
              <n-input
                v-model:value="yjPassToken"
                type="password"
                placeholder="森空岛已改版，请不要粘贴森空岛 Cred"
              ></n-input>
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
            <n-input :value="JSON.stringify(info)" type="textarea" rows="8" readonly class="x-info" />
            <n-space justify="space-between">
              <n-space>
                <n-button type="primary" v-if="origin && origin !== '*'" @click="postInfo">
                  {{ scopes ? '将部分信息授权给' : '将全部信息授权给' }} {{ appName }} …
                </n-button>
              </n-space>
              <n-space>
                <n-button @click="copyInfo">复制</n-button>
                <a :href="'data:text/json,' + encodeURIComponent(JSON.stringify(info))" :download="filename">
                  <n-button>保存为文件</n-button>
                </a>
              </n-space>
            </n-space>
            <n-space vertical>
              角色信息中包括但可能不限于以下信息，请注意保护您的隐私。
              <ul class="x-scopes">
                <li v-for="item in predefinedScopes" :key="item.path" :class="item.class">
                  {{ item.desc }} <code>{{ item.path }}</code>
                </li>
              </ul>
            </n-space>
          </n-space>
        </div>
      </n-layout-content>
      <n-layout-footer>
        本站<strong>并非</strong>由“上海鹰角探索者网络科技有限公司”、“上海鹰角网络科技有限公司”开发。我们鼓励您在使用本站功能之前仔细审阅源码，以确认我们的承诺是否属实并了解我们如何使用您的数据。
        <br />
        <a href="https://github.com/oott123/sklanding" target="_blank">查看 GitHub 代码开发者使用说明</a> |
        <a href="/_src" target="_blank">验证 Vercel 代码</a>
      </n-layout-footer>
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

.red {
  color: red;
}
</style>

<style>
.x-info textarea {
  word-break: break-all !important;
}

.x-scopes code {
  opacity: 0.5;
  font-size: 75%;
}

.x-scopes .asdfghjkl {
  color: red;
  font-weight: bold;
}

ol {
  margin: 0;
  padding: 0;
}
</style>
