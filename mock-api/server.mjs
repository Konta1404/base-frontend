// Dev-only mock of the backend auth API. Zero dependencies, in-memory storage.
// Implements the contract documented in README.md so the frontend works out of the box.
// DO NOT use in production: Google ID tokens are decoded but NOT verified.
import { createServer } from "node:http";
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT ?? 4000);
const SECRET = process.env.JWT_SECRET ?? "dev-secret";
const ACCESS_TTL = Number(process.env.ACCESS_TTL ?? 900); // seconds

const users = new Map(); // email -> { id, email, name, avatarUrl, passwordHash }
const refreshTokens = new Map(); // token -> userId

// Seed a demo user: demo@example.com / password123
users.set("demo@example.com", {
  id: randomUUID(),
  email: "demo@example.com",
  name: "Demo User",
  avatarUrl: null,
  passwordHash: hash("password123"),
});

function hash(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
function verify(password, stored) {
  const [salt, key] = stored.split(":");
  const a = Buffer.from(key, "hex");
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
function sign(payload) {
  const data = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}`;
  return `${data}.${createHmac("sha256", SECRET).update(data).digest("base64url")}`;
}
function verifyJwt(token) {
  const [h, p, s] = (token ?? "").split(".");
  if (!h || !p || !s) return null;
  const expected = createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  if (expected !== s) return null;
  const payload = JSON.parse(Buffer.from(p, "base64url").toString());
  return payload.exp * 1000 > Date.now() ? payload : null;
}

const publicUser = (user) => {
  const copy = { ...user };
  delete copy.passwordHash;
  return copy;
};
const findById = (id) => [...users.values()].find((u) => u.id === id);

function issue(user) {
  const refreshToken = randomBytes(32).toString("base64url");
  refreshTokens.set(refreshToken, user.id);
  const now = Math.floor(Date.now() / 1000);
  return {
    accessToken: sign({ sub: user.id, email: user.email, iat: now, exp: now + ACCESS_TTL }),
    refreshToken,
    expiresIn: ACCESS_TTL,
    user: publicUser(user),
  };
}

const routes = {
  "POST /auth/register": ({ body }) => {
    const { name, email, password } = body;
    if (!email || !password) return [400, { message: "Email and password are required." }];
    if (users.has(email)) return [409, { message: "Email already registered." }];
    const user = { id: randomUUID(), email, name, avatarUrl: null, passwordHash: hash(password) };
    users.set(email, user);
    return [201, issue(user)];
  },
  "POST /auth/login": ({ body }) => {
    const user = users.get(body.email);
    if (!user?.passwordHash || !verify(body.password ?? "", user.passwordHash)) {
      return [401, { message: "Invalid credentials." }];
    }
    return [200, issue(user)];
  },
  "POST /auth/google": ({ body }) => {
    // A real backend MUST verify the ID token signature, `aud` and `iss`
    // (e.g. google-auth-library's verifyIdToken).
    let claims;
    try {
      claims = JSON.parse(Buffer.from(body.idToken.split(".")[1], "base64url").toString());
    } catch {
      return [400, { message: "Invalid ID token." }];
    }
    let user = users.get(claims.email);
    if (!user) {
      user = {
        id: randomUUID(),
        email: claims.email,
        name: claims.name,
        avatarUrl: claims.picture ?? null,
      };
      users.set(claims.email, user);
    }
    return [200, issue(user)];
  },
  "POST /auth/refresh": ({ body }) => {
    const userId = refreshTokens.get(body.refreshToken);
    const user = userId && findById(userId);
    if (!user) return [401, { message: "Invalid refresh token." }];
    refreshTokens.delete(body.refreshToken); // rotate
    return [200, issue(user)];
  },
  "POST /auth/logout": ({ body }) => {
    refreshTokens.delete(body.refreshToken);
    return [204];
  },
  "GET /auth/me": ({ auth }) => {
    const user = auth && findById(auth.sub);
    return user ? [200, publicUser(user)] : [401, { message: "Unauthorized" }];
  },
  "GET /health": () => [200, { status: "ok" }],
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let body = {};
  try {
    body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
  } catch {}
  const auth = verifyJwt(req.headers.authorization?.replace(/^Bearer /, ""));
  const handler = routes[`${req.method} ${url.pathname}`];
  const [status, data] = handler ? handler({ body, auth }) : [404, { message: "Not found" }];
  console.log(`${req.method} ${url.pathname} -> ${status}`);
  res.writeHead(status, data ? { "Content-Type": "application/json" } : {});
  res.end(data ? JSON.stringify(data) : undefined);
}).listen(PORT, () => console.log(`Mock auth API on :${PORT} (demo@example.com / password123)`));
