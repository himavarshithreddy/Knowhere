import { describe, it, expect } from "vitest";
import { extractUserFromMcpContext } from "./oauthAuth.js";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

describe("OAuth Auth Helper", () => {
  it("should return null if no auth header", () => {
    const res = extractUserFromMcpContext({ req: { headers: {} } });
    expect(res).toBeNull();
  });

  it("should return null if not Bearer", () => {
    const res = extractUserFromMcpContext({ req: { headers: { authorization: "Basic abc" } } });
    expect(res).toBeNull();
  });

  it("should return null if token is invalid", () => {
    const res = extractUserFromMcpContext({ req: { headers: { authorization: "Bearer invalid_token" } } });
    expect(res).toBeNull();
  });

  it("should return null if audience is wrong", () => {
    const token = jwt.sign({ sub: "user1", aud: "wrong-aud" }, config.jwtSecret);
    const res = extractUserFromMcpContext({ req: { headers: { authorization: `Bearer ${token}` } } });
    expect(res).toBeNull();
  });

  it("should return user id if token is valid and audience matches", () => {
    const token = jwt.sign({ sub: "user1", aud: config.mcpResourceUrl }, config.jwtSecret);
    const res = extractUserFromMcpContext({ req: { headers: { authorization: `Bearer ${token}` } } });
    expect(res).toEqual({ uid: "user1" });
  });
});
