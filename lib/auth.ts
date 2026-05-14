import { betterAuth } from "better-auth";
import { createEmailVerificationToken } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { generateAnonymousName } from "./anonymous-name";
import * as schema from "./auth-schema";
import { db } from "./db";
import { sendVerificationEmail } from "./email";

const configuredSecret = process.env.BETTER_AUTH_SECRET;

if (!configuredSecret) {
  throw new Error("BETTER_AUTH_SECRET is not set.");
}

const secret = configuredSecret;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleConfigured = Boolean(googleClientId && googleClientSecret);
const baseUrl = process.env.BETTER_AUTH_URL;

if (!baseUrl) {
  throw new Error("BETTER_AUTH_URL is not set.");
}

function buildVerificationChoiceUrl(token: string, callbackURL = "/feed") {
  const url = new URL("/verify-account", baseUrl);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackURL);
  return url.toString();
}

async function sendVerificationChoiceEmail(
  email: string,
  callbackURL = "/feed",
) {
  const token = await createEmailVerificationToken(secret, email);
  const verificationLink = buildVerificationChoiceUrl(token, callbackURL);

  await sendVerificationEmail({
    to: email,
    verificationLink,
  });
}

export const auth = betterAuth({
  appName: "Private Social",
  baseURL: baseUrl,
  secret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.log("Better Auth is sending verification email to:", user.email);

      const parsedUrl = new URL(url);
      const token = parsedUrl.searchParams.get("token");
      const callbackURL = parsedUrl.searchParams.get("callbackURL") ?? "/feed";

      if (!token) {
        throw new Error(
          "Verification token was not included in the email URL.",
        );
      }

      await sendVerificationEmail({
        to: user.email,
        verificationLink: buildVerificationChoiceUrl(token, callbackURL),
      });

      console.log("Verification email sent to:", user.email);
    },
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              name: generateAnonymousName(),
            },
          };
        },
      },
    },
  },
  ...(googleConfigured
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
          },
        },
      }
    : {}),
});
