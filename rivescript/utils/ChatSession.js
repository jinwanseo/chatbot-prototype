import RiveScript from "rivescript";

export class ChatSession {
  constructor() {
    this._chatList = [];
    this.rsInit();
  }

  // RiveScript Init
  async rsInit() {
    this._rs = new RiveScript({ utf8: true, debug: false, strict: true });
    await this.syncRive();
    console.log("loading done!");
  }

  // RiveScript Sync
  async syncRive() {
    await this._rs.loadDirectory("rivescript/data/rive");
    await this._rs.sortReplies();
  }

  // ChatList Getter
  get chatList() {
    return this._chatList;
  }

  async reply(question) {
    await this.syncRive();
    const reply = await this._rs.reply("local-user", question);
    this._chatList.push({ question, reply });

    return reply;
  }

  get rs() {
    return this._rs;
  }
}
