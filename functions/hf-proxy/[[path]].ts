interface FunctionContext {
  request: Request
  params: Record<string, string | string[]>
}

const HF_ORIGIN = 'https://huggingface.co'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
  'Access-Control-Max-Age': '86400',
}

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export const onRequest = async (context: FunctionContext) => {
  const url = new URL(context.request.url)
  const rawPath = context.params.path
  const path = Array.isArray(rawPath) ? rawPath.join('/') : (rawPath || '')
  const targetUrl = `${HF_ORIGIN}/${path}${url.search}`

  const headers = new Headers(context.request.headers)
  headers.delete('host')

  const init: RequestInit = {
    method: context.request.method,
    headers,
  }

  if (!['GET', 'HEAD'].includes(context.request.method)) {
    init.body = context.request.body
  }

  const response = await fetch(targetUrl, init)

  const respHeaders = new Headers(response.headers)
  Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v))

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  })
}
