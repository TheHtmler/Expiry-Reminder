import {
  acceptHouseholdInvite,
  createHousehold,
} from "../../services/session-service";
import { sessionState } from "../../state/session";

Page({
  data: { mode: "create", name: "", token: "", loading: false },
  setMode(event: WechatMiniprogram.BaseEvent) {
    this.setData({ mode: event.currentTarget.dataset.mode });
  },
  onNameInput(event: WechatMiniprogram.Input) {
    this.setData({ name: event.detail.value });
  },
  onTokenInput(event: WechatMiniprogram.Input) {
    this.setData({ token: event.detail.value });
  },
  async onSubmit() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      if (this.data.mode === "create") {
        if (!this.data.name.trim()) throw new Error("请输入家庭名称");
        await createHousehold({
          name: this.data.name,
          timezone: "Asia/Shanghai",
        });
      } else {
        if (!this.data.token.trim()) throw new Error("请输入邀请口令");
        await acceptHouseholdInvite(this.data.token.trim());
      }
      await sessionState.bootstrap();
      await wx.reLaunch({ url: "/pages/home/index" });
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : "操作失败",
        icon: "none",
      });
    } finally {
      this.setData({ loading: false });
    }
  },
});
