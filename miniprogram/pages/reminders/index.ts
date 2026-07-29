Page({
  data: { mode: "open" as "open" | "closed" },
  setMode(event: WechatMiniprogram.BaseEvent) {
    this.setData({ mode: String(event.currentTarget.dataset.mode) as "open" | "closed" });
  },
  openItems() { wx.switchTab({ url: "/pages/items/index" }); },
});
