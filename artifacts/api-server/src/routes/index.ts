import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tokensRouter from "./tokens";
import botsRouter from "./bots";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(tokensRouter);
router.use(botsRouter);

export default router;
