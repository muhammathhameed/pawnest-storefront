import assert from "node:assert/strict";
import { resolveSiteUrl, CANONICAL_SITE_URL } from "../lib/site-url.ts";

assert.equal(resolveSiteUrl({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://github-x-3000.app.github.dev" }), CANONICAL_SITE_URL);
assert.equal(resolveSiteUrl({ VERCEL_ENV: "production" }), CANONICAL_SITE_URL);
assert.equal(resolveSiteUrl({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "http://shop.example.com" }), CANONICAL_SITE_URL);
assert.equal(resolveSiteUrl({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://shop.example.com/path?x=1" }), "https://shop.example.com");
assert.equal(resolveSiteUrl({ VERCEL_ENV: "preview", VERCEL_URL: "pawnest-git-feat-x.vercel.app" }), "https://pawnest-git-feat-x.vercel.app");
assert.equal(resolveSiteUrl({ VERCEL_ENV: "preview" }), CANONICAL_SITE_URL);
assert.equal(resolveSiteUrl({ VERCEL_ENV: "preview", VERCEL_URL: "x.vercel.app", NEXT_PUBLIC_SITE_URL: "https://x.app.github.dev" }), "https://x.vercel.app");
assert.equal(resolveSiteUrl({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "https://x.app.github.dev" }), "http://localhost:3000");
assert.equal(resolveSiteUrl({ NODE_ENV: "development" }), "http://localhost:3000");
assert.equal(resolveSiteUrl({ NODE_ENV: "development", NEXT_PUBLIC_SITE_URL: "http://localhost:4000" }), "http://localhost:4000");
assert.equal(resolveSiteUrl({ NODE_ENV: "production" }), CANONICAL_SITE_URL);
console.log("resolveSiteUrl: all assertions passed");
