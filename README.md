# sklanding

<https://skland.xkcdn.win>

## 开发者

```javascript
const appName = 'Closure++ 二游计算器' // 你的应用名字
const scope = 'chars,secretary' // 你要获取的字段

const win = window.open(
  `https://skland.xkcdn.win/?appName=${encodeURIComponent(appName)}&origin=${encodeURIComponent(
    location.origin,
  )}&scopes=${scope}`,
)

window.addEventListener('message', ({ data }) => {
  win.close() // 数据授权完成，关闭提取装置窗口
  console.log(data) // 用户的数据
})
```
