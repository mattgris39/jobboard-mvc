import { Router } from "express";

const router = Router();

router.get("/login", (req, res) => {
  res.send("Auth routes OK");
});

export default router;