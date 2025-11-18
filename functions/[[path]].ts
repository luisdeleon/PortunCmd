// Cloudflare Pages Function for SPA routing
// Handles all routes and serves index.html for non-asset paths

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)

  // Try to serve the requested asset first
  const response = await context.env.ASSETS.fetch(context.request)

  // If asset exists (200 OK), serve it
  if (response.status === 200) {
    return response
  }

  // If asset doesn't exist and it's not a file request,
  // serve index.html for SPA routing
  const pathname = url.pathname
  const hasFileExtension = /\.\w+$/.test(pathname)

  // If it's a file request that doesn't exist, return 404
  if (hasFileExtension) {
    return response
  }

  // For all other routes, serve index.html (SPA routing)
  const indexUrl = new URL('/index.html', context.request.url)
  return context.env.ASSETS.fetch(new Request(indexUrl, context.request))
}
