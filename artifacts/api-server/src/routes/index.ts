import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tokensRouter from "./tokens";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(tokensRouter);

export default router;
