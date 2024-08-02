import { Scalekit, User } from '@scalekit-sdk/node';
import bodyParser from 'body-parser';
import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import serverless from "serverless-http";

const port = process.env.PORT || 8080;
const app = express();
const scalekit = new Scalekit(
  process.env.SCALEKIT_ENV_URL!,
  process.env.SCALEKIT_CLIENT_ID!,
  process.env.SCALEKIT_CLIENT_SECRET!,
);
const users = new Map<string, User>();

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(cookieParser());


app.use(express.static(path.join(__dirname, 'web/build')));

app.get("/auth/me", async (req, res) => {
  const uid = req.cookies.uid;
  if (!uid) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = users.get(uid);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return res.json(user);
})

app.post("/auth/login", async (req, res) => {
  const { connectionId, email, organizationId } = req.body;
  const url = scalekit.getAuthorizationUrl(
    process.env.AUTH_REDIRECT_URI!,
    {
      connectionId,
      organizationId,
      loginHint: email,
    }
  )
  return res.json({
    url
  });
})

app.get("/auth/callback", async (req, res) => {
  const { code, error_description } = req.query;
  if (error_description) {
    return res.status(400).json({ message: error_description });
  }

  const { user } = await scalekit.authenticateWithCode({
    code: code as string,
    redirectUri: process.env.AUTH_REDIRECT_URI!,
  });
  //users.set(user.id, user);

  users.set(user.id, {
    "given_name" : user.givenName,
    "family_name" : user.familyName,
    "email" : user.id,
    "id" : user.id
  });

  res.cookie("uid", user.id, { httpOnly: true });

  return res.redirect("/profile");
})

app.post("/auth/logout", async (_, res) => {
  res.clearCookie("uid");
  return res.redirect("/");
})

// To handle the React 404 routing, return the index.html file
app.use((_, res) => {
  return res.sendFile(path.join(__dirname, 'web/build', 'index.html'));
})

export const handler = serverless(app);