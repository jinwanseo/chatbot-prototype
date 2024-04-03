import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("home/index", { title: "챗봇 서비스" });
});

export default router;
