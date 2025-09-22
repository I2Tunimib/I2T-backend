import { Router } from "express";
import configRoutes from "./config.route.js";
import reconciliationRoutes from "./reconciliation.route.js";
import datasetsRoutes from "./datasets.route.js";
import extensionRoutes from "./extension.route.js";
import authRoutes from "./auth.route.js";
import suggestionRoutes from "./suggestion.route.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to tUI service API");
});

router.use("/config", configRoutes);
router.use("/full-annotation", reconciliationRoutes);
router.use("/reconcilers", reconciliationRoutes);
router.use("/extenders", extensionRoutes);
router.use("/dataset", datasetsRoutes);
router.use("/auth", authRoutes);
router.use("/suggestion", suggestionRoutes);
export default router;
