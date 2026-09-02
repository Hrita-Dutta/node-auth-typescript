import { Request, Response, Router } from "express";
import requireAuth from "../middleware/requireAuth";

const router = Router();

router.get("/me", requireAuth, (req: Request, res: Response) => {
  const authReq = req as any;
  const authUser = authReq.user;

  return res.json({
    user: authUser,
  });
});

export default router;
