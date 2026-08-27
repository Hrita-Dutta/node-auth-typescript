import { Request, Response } from "express";
import { registerSchema } from "./auth.schema";
import { User } from "../../models/user.model";
import { hashPassword } from "../../lib/hash";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../lib/email";

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
    const verifyUrl = `${getAppUrl}/auth/verify-email?token=${verifyToken}`;

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
