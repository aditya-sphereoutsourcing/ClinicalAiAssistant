import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { log } from "./vite";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  log("Setting up authentication...");
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "medicine-ai-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        log(`Attempting login for user: ${username}`);
        const user = await storage.getUserByUsername(username);
        if (!user) {
          log(`Login failed for user: ${username}`);
          return done(null, false, { message: "Incorrect username" });
        }

        // Check password with bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          log(`Login failed for user: ${username}`);
          return done(null, false, { message: "Incorrect password" });
        }

        log(`Login successful for user: ${username}`);
        return done(null, user);
      } catch (error) {
        log(`Login error for user ${username}: ${error}`);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      log(`Deserializing user: ${id}`);
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      log(`Error deserializing user ${id}: ${error}`);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      log(`Registration attempt for username: ${req.body.username}`);
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        log(`Registration failed - username already exists: ${req.body.username}`);
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });
      log(`User registered successfully: ${user.id}`);

      req.login(user, (err) => {
        if (err) {
          log(`Error logging in after registration: ${err}`);
          return next(err);
        }
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json({ user: userWithoutPassword });
      });
    } catch (error) {
      log(`Registration error: ${error}`);
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    log(`User logged in successfully: ${req.user?.id}`);
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as any;
    res.status(200).json({ user: userWithoutPassword });
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    req.logout((err) => {
      if (err) {
        log(`Logout error for user ${userId}: ${err}`);
        return next(err);
      }
      log(`User logged out successfully: ${userId}`);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      log("Unauthenticated request to /api/user");
      return res.status(401).json({ user: null });
    }
    log(`Current user data requested: ${req.user?.id}`);
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as any;
    res.json({ user: userWithoutPassword });
  });

  // For backward compatibility with existing frontend
  app.get("/api/session", (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...userWithoutPassword } = req.user as any;
      res.json({ user: userWithoutPassword });
    } else {
      res.json({ user: null });
    }
  });

  log("Authentication setup completed");
}