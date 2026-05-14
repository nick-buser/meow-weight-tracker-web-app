import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";

let redis: Redis | null | undefined = undefined;
function getRedis(): Redis | null {
    if (redis !== undefined) return redis;
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
        redis = null;
        return null;
    }
    redis = new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redis;
}

const limiters = new Map<string, Ratelimit>();
function getLimiter(name: string, limit: number, window: Duration) {
    const cached = limiters.get(name);
    if (cached) return cached;
    const r = getRedis();
    if (!r) return null;
    const l = new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(limit, window),
        analytics: false,
        prefix: `mwt:${name}`,
    });
    limiters.set(name, l);
    return l;
}

/**
 * Throws TOO_MANY_REQUESTS when the caller has exceeded `limit` calls per
 * `window`. No-ops when Upstash env vars aren't set, so local dev and
 * environments without Redis still work.
 */
export async function enforceRateLimit(
    name: string,
    userId: string,
    limit: number,
    window: Duration,
) {
    const limiter = getLimiter(name, limit, window);
    if (!limiter) return;
    const { success } = await limiter.limit(userId);
    if (!success) {
        throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `Rate limit exceeded for ${name}. Try again shortly.`,
        });
    }
}
