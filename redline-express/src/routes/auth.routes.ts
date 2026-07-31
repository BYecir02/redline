import { Router } from "express";
import {
  signupController,
  loginController,
  meController,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export const authRouter = Router();

authRouter.post("/signup", signupController);
authRouter.post("/login", loginController);
authRouter.get("/me", requireAuth, meController);
