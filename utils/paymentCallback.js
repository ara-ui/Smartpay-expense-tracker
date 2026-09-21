const getForwardedValue = (value) =>
    typeof value === "string" && value.trim()
        ? value.split(",")[0].trim()
        : null;

const getPublicBaseUrl = (req) => {
    // In production, callbacks must use the server-controlled public URL.
    // Request headers can be spoofed and should only be a development fallback.
    const configuredUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
    if (configuredUrl) {
        try {
            const parsed = new URL(configuredUrl);
            if (["http:", "https:"].includes(parsed.protocol)) {
                return parsed.origin;
            }
        } catch {
            return null;
        }
    }

    const origin = getForwardedValue(req.get("origin"));
    if (origin) {
        try {
            const parsed = new URL(origin);
            if (["http:", "https:"].includes(parsed.protocol)) {
                return parsed.origin;
            }
        } catch {
            // Fall through to proxy/server-derived URL.
        }
    }

    const forwardedProto = getForwardedValue(req.get("x-forwarded-proto"));
    const forwardedHost = getForwardedValue(req.get("x-forwarded-host"));
    const protocol = forwardedProto || req.protocol || "http";
    const host = forwardedHost || req.get("host");

    if (host && ["http", "https"].includes(protocol)) {
        return `${protocol}://${host}`.replace(/\/+$/, "");
    }

    return null;
};

const getCashfreeReturnUrl = (req) => {
    const baseUrl = getPublicBaseUrl(req);
    return baseUrl ? `${baseUrl}/purchase/cashfree/return` : null;
};

const getCashfreeNotifyUrl = (req) => {
    const baseUrl = getPublicBaseUrl(req);
    return baseUrl ? `${baseUrl}/purchase/webhook/cashfree` : null;
};

module.exports = { getPublicBaseUrl, getCashfreeReturnUrl, getCashfreeNotifyUrl };
