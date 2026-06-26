import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { oauthRouter } from "./oauth.js";
import { AuthCode } from "../models/OAuth.js";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

const app = express();
app.use(express.json());
// Mock cookie parser since oauthRouter checks req.cookies
app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(";").forEach(c => {
      const [k, v] = c.split("=");
      req.cookies[k.trim()] = v.trim();
    });
  }
  next();
});
app.use("/", oauthRouter);

vi.mock("../models/OAuth.js", () => {
  return {
    AuthCode: {
      create: vi.fn(),
      findOne: vi.fn(),
      deleteOne: vi.fn(),
    }
  };
});

describe("OAuth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /.well-known/oauth-protected-resource", () => {
    it("should return resource metadata", async () => {
      const res = await request(app).get("/.well-known/oauth-protected-resource");
      expect(res.status).toBe(200);
      expect(res.body.resource).toBeDefined();
    });
  });

  describe("GET /oauth/authorize", () => {
    it("should fail with missing params", async () => {
      const res = await request(app).get("/oauth/authorize");
      expect(res.status).toBe(400);
    });

    it("should redirect to login if not authenticated", async () => {
      const res = await request(app).get("/oauth/authorize?client_id=123&redirect_uri=http://test&code_challenge=abc&code_challenge_method=S256");
      expect(res.status).toBe(302);
      expect(res.header.location).toContain("/login");
    });

    it("should create auth code and redirect to client if authenticated", async () => {
      const validToken = jwt.sign({ uid: "user1" }, config.jwtSecret);
      
      const res = await request(app)
        .get("/oauth/authorize?client_id=123&redirect_uri=http://test.com&code_challenge=abc&code_challenge_method=S256&state=xyz")
        .set("Cookie", `token=${validToken}`);

      expect(res.status).toBe(302);
      expect(res.header.location).toContain("http://test.com");
      expect(res.header.location).toContain("code=");
      expect(res.header.location).toContain("state=xyz");
      
      expect(AuthCode.create).toHaveBeenCalled();
    });
  });

  describe("POST /oauth/token", () => {
    it("should fail with invalid grant_type", async () => {
      const res = await request(app).post("/oauth/token").send({ grant_type: "password" });
      expect(res.status).toBe(400);
    });

    it("should fail if code is invalid", async () => {
      vi.mocked(AuthCode.findOne).mockResolvedValue(null);
      const res = await request(app).post("/oauth/token").send({
        grant_type: "authorization_code",
        client_id: "123",
        code: "invalid",
        code_verifier: "verifier"
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("invalid_grant");
    });
  });
});
