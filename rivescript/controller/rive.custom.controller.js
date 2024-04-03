import express from "express";
import * as fs from "fs";
import { getTopicList } from "./rive.topic.controller.js";

const router = express.Router();

// Chat List Page (Setting 가능)
router.get("", async (req, res) => {
  const result = await getCustomRiveList();

  const topicList = await getTopicList();
  const topics = topicList
    .filter((t) => t.count)
    .map((t) => ({
      title: t.title,
      questions: t.qna.map((qna) => qna.question),
    }));

  return res.render("rive/chat-setting", {
    title: "RiveScript Chat",
    result,
    topics,
  });
});

// 질문 추가
router.post("", async (req, res) => {
  let { question, answer, topic, topicQuestion } = req.body;

  console.log(question, answer, topic, topicQuestion);

  // 특수문자 체크
  if (hasSpecialChar(question))
    return res.send({
      error:
        "질문에 특수문자는 추가할 수 없습니다. (특수문자가 없어도 실제 질문시 특수문자를 앞뒤에 붙여도 설정 답변을 합니다)",
    });

  // 중복 체크
  const hasQuestion = await isQuestionIncludes(question);
  if (hasQuestion) return res.send({ error: "같은 질문이 있어요" });

  if (topic && topicQuestion) {
    answer = `{topic=${topic}}{@${answer}}`;
  }

  await fs.appendFile(
    "rivescript/data/rive/custom.rive",
    `\n+ ${question}\n- ${answer}\n// 주석\n`,
    (err) => console.log(err),
  );

  return res.send({ question, answer });
});

router.delete("", async (req, res) => {
  const { question, answer } = req.body;
  const list = await getCustomRiveList();
  const delIndex = await getQnAIndex(list, question, answer);
  list.splice(delIndex, 1);

  fs.writeFileSync(
    "rivescript/data/rive/custom.rive",
    list
      .map((item) => `+ ${item.question}\n- ${item.answer}\n// 주석\n`)
      .join(""),
  );

  return res.send({ result: "success" });
});

// Check RiveScript List
const isQuestionIncludes = async (question) => {
  const list = await getCustomRiveList();
  const index = list.findIndex((l) => l.question === question);
  return index !== -1;
};

const getQnAIndex = async (list, question, answer) => {
  return list.findIndex((l) => l.question === question && l.answer === answer);
};

// RiveScript List GET
const getCustomRiveList = async () => {
  return fs
    .readFileSync("rivescript/data/rive/custom.rive", "utf8")
    .split("// 주석\n")
    .filter((item) => item.includes("+") && item.includes("-"))
    .map((item) =>
      item
        .trim()
        .replace("\n", "")
        .split("-")
        .map((item) => item.replace("+", "").trim()),
    )
    .map((item) => ({ question: item[0], answer: item[1] }));
};

const hasSpecialChar = (string) => {
  const regex = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
  return regex.test(string);
};

export default router;
