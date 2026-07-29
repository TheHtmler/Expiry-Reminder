import { sessionState } from "../../state/session";

Page({
  data: { currentHousehold: null as unknown, isAdmin: false },
  async onShow() {
    try {
      await sessionState.ensureReady();
      const currentHousehold = sessionState.getCurrentHousehold();
      this.setData({ currentHousehold, isAdmin: currentHousehold?.role === "admin" });
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "家庭信息加载失败",
        icon: "none",
      });
    }
  },
  openPage(event: WechatMiniprogram.BaseEvent) {
    wx.navigateTo({ url: String(event.currentTarget.dataset.url) });
  },
});
