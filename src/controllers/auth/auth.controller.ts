import { Request, Response } from "express";
import { registerSchema } from "./auth.schema";
import { User } from "../../models/user.model";
import bcrypt from "bcryptjs";
import { hashPassword } from "../../lib/hash";

export async function registerHandler(req: Request, res: Response) {
  try {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid data!",
        errors: result.error.flatten(),
      });
    }

    const { name, email, password } = result.data;

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exist! Please try with different email",
      });
    }

    const passwordHash = await hashPassword(password);

    const newlyCreatedUser = await User.create({
      email: normalizedEmail,
      passwordHash,
      role: "user",
      isEmailVerified: false,
      name,
      twoFactorEnabled: false,
    });

    
  } catch (err) {}
}
