import jwt from "jsonwebtoken";
import { envs } from "../utils/const";
import { AuthUser } from "../models/authDtos";

const JWT_EXPIRATION = "1d"; // 1 gün

export const tokenService = {
  sign(user: AuthUser): string {
    return jwt.sign(
      {
        sub: user.userId,
        email: user.email,
        provider: user.authProvider,
      },
      envs.JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
  },

  verify(token: string): any {
    return jwt.verify(token, envs.JWT_SECRET);
  },
};
