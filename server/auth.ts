import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { sendWelcomeEmail } from "./notify";
import type { User } from "../shared/schema";

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user ?? false);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new LocalStrategy({ usernameField: "email", passwordField: "password" }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return done(null, false, { message: "Invalid email or password" });
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return done(null, false, { message: "Invalid email or password" });
      }
      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  })
);

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const googleAuthEnabled = Boolean(googleClientId && googleClientSecret);

if (googleAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId!,
        clientSecret: googleClientSecret!,
        callbackURL: "/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const avatarUrl = profile.photos?.[0]?.value ?? null;

          let user = await storage.getUserByGoogleId(profile.id);
          if (user) return done(null, user);

          if (email) {
            user = await storage.getUserByEmail(email);
            if (user) {
              // Link Google to an existing email/password account. Google has already
              // verified this address, so treat it as confirmed too if it wasn't yet.
              await storage.updateUser(user.id, {
                googleId: profile.id,
                authProvider: user.authProvider === "email" ? "both" : user.authProvider,
                avatarUrl: user.avatarUrl ?? avatarUrl,
                emailVerifiedAt: user.emailVerifiedAt ?? Date.now(),
              });
              user = await storage.getUserById(user.id);
              return done(null, user);
            }
          }

          const newUser = await storage.createUser({
            name: profile.displayName || "New User",
            email: email || `${profile.id}@google.local`,
            googleId: profile.id,
            authProvider: "google",
            avatarUrl,
            // Only trust this as pre-verified if Google actually returned a real email.
            emailVerifiedAt: email ? Date.now() : null,
          });
          await sendWelcomeEmail(newUser);
          return done(null, newUser);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

export default passport;
