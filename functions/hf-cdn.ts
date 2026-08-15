interface FunctionContext {
  request: Request
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
  'Access-Control-Max-Age': '86400',
}

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export const onRequestGet = async (context: FunctionContext) => {
  return handleRequest(context)
}

export const onRequestPost = async (context: FunctionContext) => {
  return handleRequest(context)
}

export const onRequestPut = async (context: FunctionContext) => {
  return handleRequest(context)
}

export const onRequestDelete = async (context: FunctionContext) => {
  return handleRequest(context)
}

async function handleRequest(context: FunctionContext) {
  const url = new URL(context.request.url)
  const target = url.searchParams.get('url')

  if (!target) {
    return new Response('Missing url parameter', { status: 400 })
  }

  const allowed = ['content-type', 'authorization', 'accept', 'range', 'accept-encoding']
  const headers = new Headers()
  for (const [key, val] of context.request.headers.entries()) {
    if (allowed.includes(key.toLowerCase())) {
      headers.set(key, val)
    }
  }

  const init: RequestInit = {
    method: context.request.method,
    headers,
  }

  if (!['GET', 'HEAD'].includes(context.request.method)) {
    init.body = context.request.body
  }

  const response = await fetch(target, init)

  const respHeaders = new Headers(response.headers)
  Object.entries(CORS_HEADERS).forEach(([k, v]) => respHeaders.set(k, v))

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  })
}
