import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import imgProxyRouter from "./imgProxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(proxyRouter);
router.use(imgProxyRouter);

export default router;
