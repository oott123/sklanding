export const config = {
  runtime: 'edge',
}

export default async function ProxyApi(request) {
  if (request.method === 'OPTIONS') {
    return new Response('forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const res = await fetch('https://as.hypergryph.com/user/oauth2/v2/grant', {
    method: request.method,
    body: request.body,
    headers: request.headers,
  })

  const newResponseHeaders = new Headers(res.headers)
  newResponseHeaders.delete('Access-Control-Allow-Origin')

  return new Response(res.body, {
    status: res.status,
    headers: newResponseHeaders,
  })
}
