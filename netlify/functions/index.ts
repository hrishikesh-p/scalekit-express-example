import { Scalekit, User } from '@scalekit-sdk/node';
import bodyParser from 'body-parser';
import cookieParser from "cookie-parser";
import express, { Router } from "express";
import path from "path";
import serverless from "serverless-http";
import { jwtDecode } from "jwt-decode";

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

const router = Router();


router.get("/me", async (req, res) => {
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

router.post("/login", async (req, res) => {
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

router.get("/callback", async (req, res) => {
  const { code, error_description } = req.query;
  if (error_description) {
    return res.status(400).json({ message: error_description });
  }

  const { user , idToken } = await scalekit.authenticateWithCode({
    code: code as string,
    redirectUri: process.env.AUTH_REDIRECT_URI!,
  });

  const decoded = jwtDecode(idToken);

  const userInfo = {
    "user" : user, 
    "idToken" : decodedG
  }

  res.cookie("uid", user.id, { httpOnly: true });

  return res.json(userInfo);
})

router.post("/logout", async (_, res) => {
  res.clearCookie("uid");
  return res.redirect("/");
})

app.use("/auth/", router);
app.use(express.static('../web/build'))

// To handle the React 404 routing, return the index.html file
app.use((_, res) => {
  return res.sendFile(path.join(__dirname, 'web/build', 'index.html'));
})

app.set('json spaces', 40);

export const handler = serverless(app);