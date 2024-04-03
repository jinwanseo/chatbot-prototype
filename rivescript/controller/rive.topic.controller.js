import express from "express";
import * as fs from "fs";

const router = express.Router();

// Topic Form
router.get("", async (req, res) => {
  const topics = await getTopicList();

  res.render("rive/chat-topic", { title: "Topic 설정", topics });
});

// Topic Add
router.post("", async (req, res) => {
  const { title, group } = req.body;
  // 토픽 리스트 조회
  const topics = await getTopicList();

  // 토픽 리스트 중 업로드 토픽 명과 같은 토픽이 있는지 확인
  const topicIndex = topics.findIndex((topic) => topic.title === title);
  if (topicIndex > -1) {
    return res.send({
      error: "이미 존재하는 주제입니다. (주제 이름을 바꿔주세요)",
    });
  }

  // 그룹이 현재 존재하는 토픽인지 확인
  if (group?.length) {
    const topicTitles = topics.map((t) => t.title);
    const groupIndex = topicTitles.findIndex((t) => group.includes(t));
    if (groupIndex === -1)
      return res.send({ error: "연관 주제는 현재 존재하지 않는 주제입니다." });
  }

  // Topic 생성
  const newTopic = getTopicStr({ title, group });

  // Topic 파일에 추가
  await fs.appendFileSync("rivescript/data/rive/topic.rive", newTopic, "utf8");

  res.send({
    result: "주제 추가 완료",
  });
});

// Topic Delete
router.delete("/:title", async (req, res) => {
  const topicTitle = req.params.title;

  // 토픽 리스트 조회
  const topicList = await getTopicList();
  const deleteTopicIndex = topicList.findIndex(
    (topic) => topic.title === topicTitle,
  );
  const deleteTopic = topicList.splice(deleteTopicIndex, 1);

  // 삭제된 토픽이 그룹에 포함되어 있는 경우 -> 삭제
  const deleteTopicIncludeGroupTopicIndex = topicList.findIndex((topic) =>
    topic.group.includes(topicTitle),
  );
  if (deleteTopicIncludeGroupTopicIndex > -1) {
    topicList[deleteTopicIncludeGroupTopicIndex].group = topicList[
      deleteTopicIncludeGroupTopicIndex
    ].group.filter((t) => t !== topicTitle);
  }

  // 삭제된 토픽이 채팅 그룹 이동 기능에 포함되어있는 경우
  // 1. 기본 대화 목록 검색 후 삭제

  // 2. 주제 별 대화 목록 검색 후 삭제
  topicList.forEach((topic) => {
    const includeIdx = topic.qna.findIndex((qna) =>
      qna.answer.includes(`{topic=${topicTitle}}`),
    );
    topic.qna.splice(includeIdx, 1);
  });

  //변경된 토픽 저장
  const result = stringifyTopic(topicList);
  await fs.writeFileSync("rivescript/data/rive/topic.rive", result, "utf8");

  // 삭제된 토픽 반환
  res.send({ result: "success", deleteTopic });
});

// Topic Chat Custom
router.get("/custom", async (req, res) => {
  // 쿼리 에서 제목 가져오기
  const title = req.query?.title;
  // 토픽 목록 가져오기
  const topics = await getTopicList();
  // 토픽 목록에서 제목으로 토픽 찾기
  const topicIndex = topics.findIndex((topic) => topic.title === title);
  // 토픽 목록에 없으면 404 에러
  if (topicIndex === -1)
    return res.status(404).send("주제를 찾을 수 없습니다.");

  // 토픽 목록에서 제목으로 토픽 찾기
  const topic = topics[topicIndex];

  res.render("rive/topic-custom", { title: "주제 속 대화 설정", topic });
});

// Topic Chat Custom Add
router.post("/custom", async (req, res) => {
  const newTopic = req.body;

  const topicList = await getTopicList();
  const topicIndex = topicList.findIndex(
    (topic) => topic.title === newTopic.title,
  );
  if (topicIndex === -1)
    return res.status(404).send("주제를 찾을 수 없습니다.");

  // 질문 중복 확인
  const qnaIndex = topicList[topicIndex].qna.findIndex((qna) =>
    qna.question.includes(newTopic.question),
  );

  // 이미 질문이 존재하는 경우
  if (qnaIndex > -1) return res.status(404).send("이미 존재하는 질문입니다.");

  topicList[topicIndex] = { ...newTopic };

  // 토픽 파일에 파싱 후 저장
  const result = stringifyTopic(topicList);

  // 파일 저장
  await fs.writeFileSync("rivescript/data/rive/topic.rive", result, "utf8");

  res.send({ result: "success" });
});

router.delete("/custom", async (req, res) => {
  const { title, question, answer } = req.body;
  const topicList = await getTopicList();
  const topicIndex = topicList.findIndex((topic) => topic.title === title);
  if (topicIndex === -1)
    return res.status(404).send("주제를 찾을 수 없습니다.");

  const qnaIndex = topicList[topicIndex].qna.findIndex(
    (qna) => qna.question.includes(question) && qna.answer.includes(answer),
  );

  if (qnaIndex === -1) return res.status(404).send("질문을 찾을 수 없습니다.");

  topicList[topicIndex].qna.splice(qnaIndex, 1);

  const result = stringifyTopic(topicList);

  print(result);

  // 파일 저장
  // await fs.writeFileSync("rivescript/data/rive/topic.rive", result, "utf8");

  res.send({ result: "success" });
});

// Topic List Get
export const getTopicList = async () => {
  return fs
    .readFileSync("rivescript/data/rive/topic.rive", "utf8")
    .split("// 주석\n")
    .filter((item) => item.includes("> topic") && item.includes("< topic"))
    .map((item) => item.replace("> topic ", "").replace("< topic", ""))
    .map(parseTopic);
};

// Topic 1개 파싱
const parseTopic = (topic) => {
  const afterTopic = {
    title: "",
    group: [],
    qna: [],
    count: 0,
  };
  let title = "";
  const qnaSample = {};
  topic.split("\n").forEach((item) => {
    const itemStr = item.trim();
    if (itemStr.includes("// %%")) {
      afterTopic.title = itemStr
        .replace("// %%", "")
        .replace("title_", "")
        .trim();
    } else if (itemStr.includes("title_")) {
      afterTopic.group = itemStr
        .split(" ")
        .map((group) => group.replace("title_", ""))
        .filter((group) => group !== afterTopic.title);
    } else if (itemStr.includes("+")) {
      qnaSample.title = title;
      qnaSample.question = itemStr.replace("+ ", "").trim();
    } else if (itemStr.includes("-")) {
      qnaSample.answer = itemStr.replace("-", "").trim();
      afterTopic.qna.push({ ...qnaSample });
      afterTopic.count++;
    }
  });

  return afterTopic;
};

// Topic List -> String
const stringifyTopic = (topicList) => {
  return topicList.map(getTopicStr).join("");
};

// Topic 추가시 .rive 에 필요한 형식으로 변환
const getTopicStr = (topic) => {
  /**
   * Topic 형식
   * title: 주제명
   * group: 연관 주제 (현재는 한개만 지원)
   * qna: 질문과 답변 {question, answer}
   * count: 질문과 답변 개수
   */
  const newTitle = `title_${topic.title}`;
  const newGroup =
    topic?.group && topic.group?.length > 0
      ? `${topic?.group?.map((g) => `title_${g}`).join(" ")}`
      : "";
  const newQna = topic?.qna?.length
    ? topic?.qna
        ?.map(({ question, answer }) => `\n+ ${question}\n- ${answer}\n`)
        .join("")
    : "";

  return `
// 주석
// %%${newTitle}
> topic ${newTitle} ${newGroup}
${newQna}
< topic
// 주석
`;
};

export default router;
