import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);
  // Browsers reject SameSite=None without Secure. Local HTTP development
  // uses same-site cookies; the existing HTTPS deployment policy stays intact.
  const localHttpDevelopment =
    process.env.NODE_ENV !== "production" &&
    LOCAL_HOSTS.has(req.hostname) &&
    !secure;

  return {
    httpOnly: true,
    path: "/",
    sameSite: localHttpDevelopment ? "lax" : "none",
    secure,
  };
}
