import {
  dissolveHousehold,
  listHouseholdMembers,
  transferHouseholdAdmin,
  updateHouseholdSettings,
  type HouseholdMemberView,
} from "../../services/session-service";
import { getCurrentHouseholdId, sessionState } from "../../state/session";

const HOURS = Array.from({ length: 24 }, (_, index) => index);

Page({
  data: {
    isAdmin: false,
    name: "",
    timezone: "Asia/Shanghai",
    reminderHour: 9,
    hours: HOURS,
    hourLabels: HOURS.map((hour) => `${String(hour).padStart(2, "0")}:00`),
    members: [] as HouseholdMemberView[],
    targetIndex: -1,
    saving: false,
  },
  async onLoad() {
    const household = sessionState.getCurrentHousehold();
    if (!household) return;
    const isAdmin = household.role === "admin";
    this.setData({
      isAdmin,
      name: household.name,
      timezone: household.timezone ?? "Asia/Shanghai",
      reminderHour: household.reminderHour ?? 9,
    });
    if (isAdmin) {
      const members = (await listHouseholdMembers(household.id)).filter(
        (member) => !member.isSelf,
      );
      this.setData({ members });
    }
  },
  onNameInput(event: WechatMiniprogram.Input) { this.setData({ name: event.detail.value }); },
  onTimezoneInput(event: WechatMiniprogram.Input) { this.setData({ timezone: event.detail.value }); },
  onHourChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ reminderHour: HOURS[Number(event.detail.value)] ?? 9 });
  },
  onTargetChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ targetIndex: Number(event.detail.value) });
  },
  async onSave() {
    const householdId = getCurrentHouseholdId();
    if (!householdId || !this.data.isAdmin) return;
    this.setData({ saving: true });
    try {
      await updateHouseholdSettings({
        householdId,
        name: this.data.name,
        timezone: this.data.timezone,
        reminderHour: this.data.reminderHour,
      });
      await sessionState.bootstrap();
      wx.showToast({ title: "已保存", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" });
    } finally { this.setData({ saving: false }); }
  },
  async onTransfer() {
    const household = sessionState.getCurrentHousehold();
    const target = this.data.members[this.data.targetIndex];
    if (!household || !target) {
      wx.showToast({ title: "请选择接任管理员", icon: "none" });
      return;
    }
    const result = await wx.showModal({
      title: "转让管理员",
      content: `确定转让“${household.name}”的管理员身份吗？`,
    });
    if (!result.confirm) return;
    await transferHouseholdAdmin(household.id, target.userId);
    await sessionState.bootstrap();
    wx.navigateBack();
  },
  async onDissolve() {
    const household = sessionState.getCurrentHousehold();
    if (!household) return;
    const result = await wx.showModal({
      title: "解散家庭",
      content: `确定解散“${household.name}”吗？家庭成员将立即失去访问权限。`,
      confirmColor: "#B53C2D",
    });
    if (!result.confirm) return;
    await dissolveHousehold(household.id);
    await sessionState.bootstrap();
    await wx.reLaunch({ url: sessionState.needsOnboarding ? "/pages/onboarding/index" : "/pages/home/index" });
  },
});
