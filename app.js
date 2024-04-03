import createError from "http-errors";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import rsRouter from "./rivescript/controller/rive.controller.js";
import rsCustomRouter from "./rivescript/controller/rive.custom.controller.js";
import homeRouter from "./home/controller/home.controller.js";
import rsTopicRouter from "./rivescript/controller/rive.topic.controller.js";

const pathname = new URL(".", import.meta.url).pathname;
const app = express();

app.set("views", path.join(pathname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(pathname, "public")));

app.use("*", (req, res, next) => {
  // 모든 페이지에서 middleware 실행
  next();
});

app.use("/", homeRouter);
app.use("/chat", rsRouter);

app.use("/custom", rsCustomRouter);
app.use("/topic", rsTopicRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export default app;
