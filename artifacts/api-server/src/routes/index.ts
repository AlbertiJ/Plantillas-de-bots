import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tokensRouter from "./tokens";
import botsRouter from "./bots";
import botProfilesRouter from "./bot-profiles";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use(tokensRouter);
router.use(botsRouter);
router.use(botProfilesRouter);

export default router;
