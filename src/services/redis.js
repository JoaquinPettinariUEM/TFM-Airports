import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient;
let connectPromise;

export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL,
    });

    redisClient.on("error", (error) => {
      console.error("Redis error:", error);
    });
  }

  if (!redisClient.isOpen) {
    if (!connectPromise) {
      connectPromise = redisClient.connect().finally(() => {
        connectPromise = undefined;
      });
    }
    await connectPromise;
  }

  return redisClient;
}
