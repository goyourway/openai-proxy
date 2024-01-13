const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === "string" ? k === key : k.test(key)))) {
      const value = headers.get(key);
      if (typeof value === "string") {
        picked.set(key, value);
      }
    }
  }
  return picked;
};

const modifySetCookieHeaders = (
  setCookieHeaders: string[] | null,
  oldDomain: string,
  newDomain: string
): string[] => {
  if (!setCookieHeaders) return [];
  return setCookieHeaders.map(header =>
    header.replace(
      new RegExp(`Domain=${oldDomain}`, 'i'),
      `Domain=${newDomain}`
    )
  );
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

export default async function handleRequest(req: Request & { nextUrl?: URL }) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS,
    });
  }

  const { pathname, search } = req.nextUrl ? req.nextUrl : new URL(req.url);
  const url = new URL(pathname + search, "https://web.chatcatapi.xyz").href;
  const headers = pickHeaders(req.headers, ["content-type", "authorization"]);

  const res = await fetch(url, {
    body: req.body,
    method: req.method,
    headers,
  });

// Get all Set-Cookie headers and modify their domains
const setCookieHeaders = res.headers.get('Set-Cookie');
let newSetCookieHeaders: string[] = [];
if (setCookieHeaders) {
  newSetCookieHeaders = modifySetCookieHeaders(
    setCookieHeaders.split(/,\s*(?=[^;]+=[^;]+;)/), // Correctly split multiple Set-Cookie headers
    'web.chatcatapi.xyz',
    'dalle.chatcatapi.xyz'
  );
}



  const resHeaders = {
    ...CORS_HEADERS,
    ...Object.fromEntries(
      pickHeaders(res.headers, ["content-type", /^x-ratelimit-/, /^openai-/])
    ),
  };

// If there are modified Set-Cookie headers, add them to the response headers
newSetCookieHeaders.forEach(header => {
  resHeaders.append('Set-Cookie', header);
});
  
  return new Response(res.body, {
    headers: resHeaders,
    status: res.status
  });
}
