import {
  createHouseholdInvite,
  listHouseholdMembers,
  removeHouseholdMember,
  type HouseholdMemberView,
} from "../../services/session-service";
import { getCurrentHouseholdId, sessionState } from "../../state/session";

Page({
  data: {
    members: [] as HouseholdMemberView[],
    isAdmin: false,
    loading: true,
  },
  async onShow() {
    await this.loadMembers();
  },
  async loadMembers() {
    const householdId = getCurrentHouseholdId();
    if (!householdId) return;
    this.setData({ loading: true });
    try {
      const members = await listHouseholdMembers(householdId);
      this.setData({
        members,
        isAdmin: sessionState.getCurrentHousehold()?.role === "admin",
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
  async onInvite() {
    const householdId = getCurrentHouseholdId();
    if (!householdId) return;
    try {
      const invite = await createHouseholdInvite(householdId);
      await wx.setClipboardData({ data: invite.token });
      wx.showModal({
        title: "邀请口令已复制",
        content: `口令将在 24 小时后失效：${invite.token}`,
        showCancel: false,
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "邀请失败", icon: "none" });
    }
  },
  async onRemove(event: WechatMiniprogram.BaseEvent) {
    const householdId = getCurrentHouseholdId();
    const userId = String(event.currentTarget.dataset.id);
    if (!householdId) return;
    const result = await wx.showModal({
      title: "移除家庭成员",
      content: `确定从“${sessionState.getCurrentHousehold()?.name ?? "当前家庭"}”移除此成员吗？`,
      confirmColor: "#B53C2D",
    });
    if (!result.confirm) return;
    try {
      await removeHouseholdMember(householdId, userId);
      await this.loadMembers();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "移除失败", icon: "none" });
    }
  },
});
