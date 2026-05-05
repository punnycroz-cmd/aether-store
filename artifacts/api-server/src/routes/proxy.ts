import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const BACKEND = "https://f70cef08-b1c6-4363-88e3-774e02123f6e-00-1btn7n40xrnba.kirk.replit.dev";

const router = Router();

/** Strip Domain and adjust SameSite so the cookie is valid on the proxy origin */
function sanitizeSetCookie(header: string): string {
  return header
    .split(/;\s*/g)
    .filter(part => !/^domain=/i.test(part))
    .map(part => {
      if (/^samesite=none/i.test(part)) return "SameSite=Lax";
      if (/^samesite=strict/i.test(part)) return "SameSite=Lax";
      return part;
    })
    .join("; ");
}

// Express 5 / path-to-regexp v8 uses {*path} for wildcard capture
router.all("/proxy{/*path}", async (req: Request, res: Response) => {
  const params = req.params as Record<string, string | string[] | undefined>;
  const subPath = Array.isArray(params.path)
    ? params.path.join("/")
    : (params.path ?? "").replace(/^\//, "");

  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const targetUrl = `${BACKEND}/${subPath}${query}`;

  logger.info({ method: req.method, target: targetUrl }, "proxy →");

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (req.headers.cookie) {
      headers["Cookie"] = req.headers.cookie as string;
    }

    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization as string;
    }

    const fetchOpts: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, fetchOpts);

    // Forward Set-Cookie headers with sanitized domain/SameSite
    const rawSetCookie = upstream.headers.get("set-cookie");
    if (rawSetCookie) {
      // handle multiple set-cookie headers (joined by fetch as comma-separated)
      const cookies = rawSetCookie
        .split(/,(?=[^ ])/g)
        .map(sanitizeSetCookie);
      res.setHeader("Set-Cookie", cookies);
    }

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (err) {
    logger.error({ err, target: targetUrl }, "proxy error");
    res.status(502).json({ detail: "Backend unreachable" });
  }
});

export default router;
