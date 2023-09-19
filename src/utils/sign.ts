import md5 from 'js-md5'

export async function signSkLand(path: string, token: string) {
  const timestamp = `${Math.floor(Date.now() / 1000)}`
  const platform = '3'
  const dId = navigator.userAgent
  const vName = '1.0.0'

  const headers = {
    dId,
    platform,
    timestamp,
    vName,
  }
  if (!token) {
    return headers
  }

  const signPayload = `${path.replace(
    /\?/,
    '',
  )}${timestamp}{"platform":"${platform}","timestamp":"${timestamp}","dId":${JSON.stringify(dId)},"vName":"${vName}"}`

  const key = await crypto.subtle.importKey('raw', encodeUTF8(token), { name: 'HMAC', hash: 'SHA-256' }, true, ['sign'])
  const intPayload = await crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, key, encodeUTF8(signPayload))

  const res = md5.hex(buf2hex(intPayload))

  return {
    ...headers,
    Sign: res,
  }
}

const utf8decoder = new TextDecoder()
const utf8encoder = new TextEncoder()

export function decodeUTF8(buf: Uint8Array) {
  return utf8decoder.decode(buf)
}

export function encodeUTF8(str: string) {
  return utf8encoder.encode(str)
}

function buf2hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, '0')).join('')
}
