import { NextFunction, Request, Response } from "express";

const requireRole = (role: "admin" | "user") => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as any;
    const authUser = authReq.user;

    if (!authUser) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }

    if (authUser.role !== role) {
      return res.status(401).json({
        message: "User does not have admin access",
      });
    }

    next();
  };
};

export default requireRole;
