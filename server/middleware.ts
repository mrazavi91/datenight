import type { Request, Response, NextFunction } from "express";
import type { User } from "../shared/schema";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function requireCouple(req: Request, res: Response, next: NextFunction) {
  const user = req.user as User | undefined;
  if (!user?.coupleId) {
    return res.status(403).json({ message: "You need to join or create a couple space first" });
  }
  next();
}
