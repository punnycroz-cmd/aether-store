export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Get the backend URL from environment variables
  // If not set, fallback to a placeholder (you should set this in Cloudflare dashboard)
  const backendBaseUrl = env.BACKEND_URL || 'https://your-replit-backend.app';
  
  // Extract the path after /api/proxy/
  // Example: /api/proxy/history -> /history
  const path = url.pathname.replace(/^\/api\/proxy/, '');
  
  // Construct the final URL to your backend
  const targetUrl = new URL(path + url.search, backendBaseUrl);
  
  // Copy the original request headers
  const newHeaders = new Headers(request.headers);
  
  // Optional: Set some proxy headers
  newHeaders.set('X-Forwarded-Host', url.host);
  newHeaders.set('X-Forwarded-Proto', 'https');
  
  // Perform the fetch to your real backend
  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers: newHeaders,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : null,
    redirect: 'manual'
  });

  // Return the response back to the browser
  return response;
}
