import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router = Router();

const ALLOWED_HOSTS = [
  "pub-b770478fe936495c8d44e69fb02d2943.r2.dev",
  "r2.dev",
];

function isAllowed(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

router.get("/img-proxy", async (req: Request, res: Response) => {
  const raw = req.query.url as string | undefined;
  if (!raw) {
    res.status(400).json({ detail: "Missing url param" });
    return;
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(raw);
  } catch {
    res.status(400).json({ detail: "Invalid url encoding" });
    return;
  }

  if (!isAllowed(targetUrl)) {
    res.status(403).json({ detail: "URL not allowed" });
    return;
  }

  try {
    logger.info({ target: targetUrl }, "img-proxy →");
    const upstream = await fetch(targetUrl);

    if (!upstream.ok) {
      res.status(upstream.status).send();
      return;
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    logger.error({ err, target: targetUrl }, "img-proxy error");
    res.status(502).json({ detail: "Image unreachable" });
  }
});

export default router;
