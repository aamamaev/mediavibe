import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { Express } from "express";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePassword(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
    }
  }
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || "cinefeels-secret-key";

  // Secure cookies require HTTPS. When the app is served over plain HTTP
  // (e.g. by IP address), set SESSION_COOKIE_SECURE=false.
  const cookieSecure =
    process.env.SESSION_COOKIE_SECURE !== undefined
      ? process.env.SESSION_COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production";

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: cookieSecure,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Неверный логин или пароль" });
        }
        
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Неверный логин или пароль" });
        }
        
        return done(null, {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        });
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { username, password, displayName } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Логин и пароль обязательны" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Пользователь уже существует" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        displayName: displayName || username,
      });

      req.login(
        {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        (err) => {
          if (err) return next(err);
          res.json({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
          });
        }
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Ошибка авторизации" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.json({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Ошибка выхода" });
      }
      res.json({ message: "Выход выполнен" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json(null);
    }
    res.json(req.user);
  });
}
