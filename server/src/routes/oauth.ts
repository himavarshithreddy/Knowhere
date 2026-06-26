import { Router } from "express";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AuthCode } from "../models/OAuth.js";

export const oauthRouter = Router();

oauthRouter.get("/.well-known/oauth-protected-resource", (req, res) => {
  res.json({
    resource: config.mcpResourceUrl,
    authorization_servers: [config.oauthIssuerUrl],
    scopes_supported: ["knowhere:read"],
    resource_documentation: "https://knowhere.app/docs"
  });
});

oauthRouter.get("/.well-known/oauth-authorization-server", (req, res) => {
  res.json({
    issuer: config.oauthIssuerUrl,
    authorization_endpoint: `${config.oauthIssuerUrl}/oauth/authorize`,
    token_endpoint: `${config.oauthIssuerUrl}/oauth/token`,
    client_id_metadata_document_supported: true,
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["knowhere:read"]
  });
});

oauthRouter.get("/oauth/authorize", async (req, res) => {
  const { client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query;

  // Validate parameters
  if (!client_id || !redirect_uri || !code_challenge || code_challenge_method !== "S256") {
    return res.status(400).send("Missing or invalid OAuth parameters.");
  }

  // Check authentication
  const token = req.cookies?.token;
  let uid: string | null = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { uid: string };
      uid = decoded.uid;
    } catch (e) {
      // invalid token
    }
  }

  // If not logged in, redirect to frontend login with returnTo
  if (!uid) {
    const returnTo = encodeURIComponent(req.originalUrl);
    return res.redirect(`${config.clientUrl}/login?returnTo=${returnTo}`);
  }

  // Auto-approve and generate code
  const code = crypto.randomBytes(32).toString("hex");
  
  await AuthCode.create({
    code,
    codeChallenge: String(code_challenge),
    clientId: String(client_id),
    redirectUri: String(redirect_uri),
    userId: uid,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  });

  // Redirect back to client with code and state
  const targetUrl = new URL(String(redirect_uri));
  targetUrl.searchParams.set("code", code);
  if (state) {
    targetUrl.searchParams.set("state", String(state));
  }

  res.redirect(targetUrl.toString());
});

oauthRouter.post("/oauth/token", async (req, res) => {
  const { grant_type, client_id, code, redirect_uri, code_verifier } = req.body;

  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }

  if (!client_id || !code || !code_verifier) {
    return res.status(400).json({ error: "invalid_request" });
  }

  const authCode = await AuthCode.findOne({ code, clientId: client_id });
  if (!authCode) {
    return res.status(400).json({ error: "invalid_grant" });
  }

  // Verify PKCE S256
  const hash = crypto.createHash("sha256").update(code_verifier).digest("base64url");
  if (hash !== authCode.codeChallenge) {
    await authCode.deleteOne();
    return res.status(400).json({ error: "invalid_grant" });
  }

  // Check redirect URI
  if (redirect_uri && redirect_uri !== authCode.redirectUri) {
    return res.status(400).json({ error: "invalid_grant" });
  }

  await authCode.deleteOne();

  // Create JWT access token
  const accessToken = jwt.sign(
    { 
      sub: authCode.userId,
      aud: config.mcpResourceUrl,
      scopes: ["knowhere:read"]
    },
    config.jwtSecret,
    { 
      expiresIn: "1h",
      issuer: config.oauthIssuerUrl
    }
  );

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: "knowhere:read"
  });
});
