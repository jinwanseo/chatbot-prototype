import express from "express";
import { ChatSession } from "../utils/ChatSession.js";

const router = express.Router();

// 이후 Redis 로 관리
const chatMemorySession = {};

// Chat Form
router.get("", (req, res) => {
  const chatId = req.query?.chatId;
  chatMemorySession[chatId] = new ChatSession();
  res.render("rive/chat-bot", { title: "RiveScript Chat" });
});

// Chat Process
router.post("", async (req, res, next) => {
  const chatId = req.query?.chatId;

  if (!chatMemorySession[chatId]) chatMemorySession[chatId] = new ChatSession();

  const { question } = req.body;

  const session = chatMemorySession[chatId];
  const reply = await session.reply(question);

  res.send({ result: reply });
});

export default router;
