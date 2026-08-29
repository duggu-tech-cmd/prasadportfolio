/**
 * Self-contained Cloudflare Worker for Unity WebGL builds
 * Fetches assets directly from GitHub and adds correct headers for .br files
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Handle incoming requests
 * @param {Request} request
 */
async function handleRequest(request) {
  const url = new URL(request.url)

  // Add a header to trace the request
  const traceId = crypto.randomUUID()

  // Handle Unity WebGL Brotli-compressed files - SET CORRECT HEADERS HERE
  if (url.pathname.match(/\.(br)$/i)) {
    // Fetch directly from GitHub raw content
    const githubUrl = `https://raw.githubusercontent.com/prasad1231/prasad-hegde-gamesdev-pro/main${url.pathname}`

    try {
      const originalResponse = await fetch(githubUrl, {
        headers: {
          'User-Agent': 'Cloudflare Worker-Unity-Fetcher',
          'Accept': '*/*'
        }
      })

      if (!originalResponse.ok) {
        return new Response(`GitHub fetch failed: ${originalResponse.status}`, {
          status: 502,
          headers: {
            'Content-Type': 'text/plain',
            'x-trace-id': traceId,
            'x-error-stage': 'github-response-not-ok'
          }
        })
      }

      // Get the body as bytes
      const body = await originalResponse.arrayBuffer()

      // Create new headers based on original
      const headers = new Headers(originalResponse.headers)

      // Set correct Content-Encoding and Content-Type based on file extension
      // Using explicit variable assignment for debugging
      let contentEncoding = null
      let contentType = null

      if (url.pathname.endsWith('.data.br')) {
        contentEncoding = 'br'
        contentType = 'application/octet-stream'
      } else if (url.pathname.endsWith('.wasm.br')) {
        contentEncoding = 'br'
        contentType = 'application/wasm'
      } else if (url.pathname.endsWith('.framework.js.br')) {
        contentEncoding = 'br'
        contentType = 'application/javascript'
      } else if (url.pathname.endsWith('.symbols.json.br')) {
        contentEncoding = 'br'
        contentType = 'application/octet-stream'
      }

      // Apply the headers if we determined them
      if (contentEncoding !== null) {
        headers.set('Content-Encoding', contentEncoding)
      }
      if (contentType !== null) {
        headers.set('Content-Type', contentType)
      }

      // Add debug headers to verify header setting worked
      headers.set('x-debug-trace-id', traceId)
      headers.set('x-debug-content-encoding', contentEncoding || 'NOT SET')
      headers.set('x-debug-content-type', contentType || 'NOT SET')
      headers.set('x-debug-path', url.pathname)
      headers.set('x-debug-matched', url.pathname.match(/\.(br)$/i) ? 'YES' : 'NO')
      headers.set('x-debug-body-length', body.byteLength)
      headers.set('x-debug-original-content-type', originalResponse.headers.get('Content-Type') || 'NO ORIGINAL CT')

      // Return response with correct headers and body
      return new Response(body, {
        status: originalResponse.status,
        statusText: originalResponse.statusText,
        headers
      })
    } catch (error) {
      // If fetch fails, return error
      return new Response(`Fetch error: ${error.message}`, {
        status: 502,
        headers: {
          'Content-Type': 'text/plain',
          'x-trace-id': traceId,
          'x-error-stage': 'fetch-catch'
        }
      })
    }
  }

  // For all other requests (HTML, JS, CSS, etc.), serve from GitHub
  const githubUrl = `https://raw.githubusercontent.com/prasad1231/prasad-hegde-gamesdev-pro/main${url.pathname}`

  try {
    const response = await fetch(githubUrl, {
      headers: {
        'User-Agent': 'Cloudflare Worker-Unity-Fetcher',
        'Accept': '*/*'
      }
    })

    if (!response.ok) {
      return new Response(`GitHub fetch failed: ${response.status}`, {
        status: 502,
        headers: {
          'Content-Type': 'text/plain',
          'x-trace-id': traceId,
          'x-error-stage': 'non-br-github-response-not-ok'
        }
      })
    }

    // Add trace ID to non-br responses too
    const headers = new Headers(response.headers)
    headers.set('x-trace-id', traceId)
    headers.set('x-debug-non-br', 'YES')

    // Create new response with modified headers
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  } catch (error) {
    return new Response(`Fetch error: ${error.message}`, {
      status: 502,
      headers: {
        'Content-Type': 'text/plain',
        'x-trace-id': traceId,
        'x-error-stage': 'non-br-fetch-catch'
      }
    })
  }
}