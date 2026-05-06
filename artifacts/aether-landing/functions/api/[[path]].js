export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // CASE 1: Image Proxy (/api/img-proxy?url=...)
  // This handles loading images directly via Cloudflare to avoid CORS and hide the source.
  if (url.pathname.includes('/img-proxy')) {
    const targetImgUrl = url.searchParams.get('url');
    if (!targetImgUrl) return new Response('Missing image URL', { status: 400 });
    
    try {
      const imgResponse = await fetch(targetImgUrl, {
        headers: { 'User-Agent': 'Cloudflare-Proxy' }
      });
      
      // Copy the original headers (Content-Type, etc.)
      const responseHeaders = new Headers(imgResponse.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Cache-Control', 'public, max-age=86400');
      
      return new Response(imgResponse.body, {
        status: imgResponse.status,
        headers: responseHeaders
      });
    } catch (err) {
      return new Response('Failed to fetch image: ' + err.message, { status: 502 });
    }
  }

  // CASE 2: API Data Proxy (/api/proxy/...)
  // This handles forwarding your database/generation requests to your Replit backend.
  if (url.pathname.includes('/proxy')) {
    const backendBaseUrl = env.BACKEND_URL || 'https://your-replit-backend.app';
    const path = url.pathname.replace(/^\/api\/proxy/, '');
    const targetUrl = new URL(path + url.search, backendBaseUrl);
    
    const newHeaders = new Headers(request.headers);
    newHeaders.set('X-Forwarded-Host', url.host);
    
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : null,
      redirect: 'manual'
    });

    return response;
  }

  return new Response('Not Found', { status: 404 });
}
