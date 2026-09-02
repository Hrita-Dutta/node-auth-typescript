import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routers/auth.routes";
import userRouter from "./routers/user.routes";

const app = express();

app.use(express.json());

app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/user", userRouter);

export default app;
