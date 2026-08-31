import { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.schema";
import { User } from "../../models/user.model";
import { checkPassword, hashPassword } from "../../lib/hash";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../lib/email";
import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../../lib/token";
import crypto from "crypto";

function getAppUrl() {
  return process.env.APP_URL || `http://localhost:${process.env.PORT}`;
}

export async function registerHandler(req: Request, res: Response) {
  try {
    // register schema check
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid data!",
        errors: result.error.flatten(),
      });
    }

    // collecting user data
    const { name, email, password } = result.data;

    const normalizedEmail = email.toLowerCase().trim();

    // checking for existing email
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exist! Please try with different email",
      });
    }

    // hashing password
    const passwordHash = await hashPassword(password);

    // creating new user
    const newlyCreatedUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      role: "user",
      isEmailVerified: false,
      name,
      twoFactorEnabled: false,
    });

    // email verfication part

    const verifyToken = jwt.sign(
      {
        sub: newlyCreatedUser.id,
      },
      process.env.JWT_ACCESS_SECRET!,
      {
        expiresIn: "1d",
      },
    );

    // creating email verify link
    const verifyUrl = `${getAppUrl()}/auth/verify-email?token=${verifyToken}`;

    // send email to the user
    await sendEmail(
      newlyCreatedUser.email, // email
      "Verify your email", // subject
      `<p>Please verify your email by clicking this link:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        `,
    );

    return res.status(201).json({
      message: "User registered",
      user: {
        id: newlyCreatedUser.id,
        email: newlyCreatedUser.email,
        role: newlyCreatedUser.role,
        isEmailVerified: newlyCreatedUser.isEmailVerified,
      },
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function verifyEmailHandler(req: Request, res: Response) {
  // token from link query
  const token = req.query.token as string | undefined;

  if (!token) {
    return res.status(400).json({
      message: "Verification token is missing",
    });
  }

  // email token verify
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      sub: string;
    };

    // finding user with the ID from DB
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }

    // User verfification check
    if (user.isEmailVerified) {
      return res.json({ message: "Email is already verified" });
    }

    // updating email verified status for a user
    user.isEmailVerified = true;
    await user.save();

    return res.json({ message: "Email is now verified! You can login" });
  } catch (err) {
    console.log(err);

    return res.json(500).json({
      message: "Internal server error",
    });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    // login schema
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid data!",
        errors: result.error.flatten(),
      });
    }

    // destructuring data
    const { email, password } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // finding registerd user
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // comparing bcrypted password
    const ok = await checkPassword(password, user.passwordHash);

    if (!ok) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // check email verification
    if (!user.isEmailVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in..." });
    }

    // create access token
    const accessToken = createAccessToken(
      user.id,
      user.role,
      user.tokenVersion,
    );

    // create refresh token
    const refreshToken = createRefreshToken(user.id, user.tokenVersion);

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successfully done",
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnables: user.twoFactorEnabled,
      },
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function refreshHandler(req: Request, res: Response) {
  try {
    const token = req.cookies?.refreshToken as string | undefined;

    if (!token) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const payload = verifyRefreshToken(token);

    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({
        message: "Refresh token invalidated",
      });
    }

    const newAccessToken = createAccessToken(
      user.id,
      user.role,
      user.tokenVersion,
    );

    const newRefreshToken = createRefreshToken(user.id, user.tokenVersion);

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Token refreshed",
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnables: user.twoFactorEnabled,
      },
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function logoutHandler(req: Request, res: Response) {
  res.clearCookie("refreshToken", { path: "/" });

  return res.status(200).json({
    message: "Logged out",
  });
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  const { email } = req.body as { email?: string };

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({
        message:
          "If an account with this email exists, we will send you a reset link",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await user.save();

    const resetUrl = `${getAppUrl()}/auth/reset-password?token=${rawToken}`;

    await sendEmail(
      user.email,
      "Rest your password",
      `
        <p>Your requested password reset. Click on the below link to reset the password</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        `,
    );

    return res.json({
        message:
          "If an account with this email exists, we will send you a reset link",
      });
  } catch (e) {
    console.log(e);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
