import { sessionState } from "../../state/session";

Page({
  data: { households: [] as typeof sessionState.households, currentId: "" },
  onShow() {
    this.setData({
      households: sessionState.households,
      currentId: sessionState.currentHouseholdId ?? "",
    });
  },
  onSwitch(event: WechatMiniprogram.BaseEvent) {
    try {
      sessionState.switchHousehold(String(event.currentTarget.dataset.id));
      wx.navigateBack();
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "切换失败",
        icon: "none",
      });
    }
  },
  onCreateOrJoin() {
    wx.navigateTo({ url: "/pages/onboarding/index" });
  },
});
