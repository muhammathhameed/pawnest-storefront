import assert from "node:assert/strict";
import { safeNextPath, nextFromParams, matchesPrefix, isAdminRole } from "../lib/auth/redirect";

assert.equal(safeNextPath("/account/orders"), "/account/orders");
assert.equal(safeNextPath(null), "/account");
assert.equal(safeNextPath("//evil.com"), "/account");
assert.equal(safeNextPath("https://evil.com"), "/account");
assert.equal(safeNextPath("/\\evil.com"), "/account");
assert.equal(safeNextPath("%2F%2Fevil.com"), "/account");
assert.equal(safeNextPath("/login?next=/login"), "/account");
assert.equal(safeNextPath("/auth/callback"), "/account");
assert.equal(safeNextPath("/%E0%A4%A"), "/account");
assert.equal(safeNextPath("/checkout"), "/checkout");
assert.equal(nextFromParams(new URLSearchParams("redirect=%2Fcheckout")), "/checkout");
assert.equal(nextFromParams(new URLSearchParams("next=/a&redirect=/b")), "/a");
assert.ok(matchesPrefix("/account/orders", ["/account"]));
assert.ok(!matchesPrefix("/accounting", ["/account"]));
assert.ok(isAdminRole("admin") && isAdminRole("super_admin"));
assert.ok(!isAdminRole("customer") && !isAdminRole(null));
console.log("redirect helpers: all assertions passed");

import { strength } from "../lib/auth/password";
assert.equal(strength(""), 0);
assert.ok(strength("abc") === 0);
assert.ok(strength("password1") >= 2 && strength("password1") < 4);
assert.equal(strength("Tr0ub4dor&3xyz!"), 4);
console.log("password strength: all assertions passed");

import { isMissingVerifier } from "../lib/auth/errors";
assert.ok(isMissingVerifier("invalid request: both auth code and code verifier should be non-empty"));
assert.ok(isMissingVerifier("PKCE code verifier not found in storage"));
assert.ok(!isMissingVerifier("Email link is invalid or has expired"));
assert.ok(!isMissingVerifier(null));
console.log("verifier error detection: all assertions passed");
