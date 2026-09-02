import { Request, Response, Router } from "express";
import requireAuth from "../middleware/requireAuth";
import requireRole from "../middleware/requireRole";
import { User } from "../models/user.model";

const router = Router();

router.get(
  "/users",
  requireAuth,
  requireRole("admin"),
  async (req: Request, res: Response) => {
    try {
      const users = await User.find(
        {},
        {
          email: 1,
          role: 1,
          isEmailVerified: 1,
          createdAt: 1,
        },
      ).sort({ createdAt: -1 });

      const result = users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isEmailVerified: u.isEmailVerified,
        createdAt: u.createdAt,
      }));

      return res.json({ user: result });
    } catch (err) {
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  },
);

export default router;
