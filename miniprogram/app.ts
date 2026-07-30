import { sessionState } from "./state/session";
import { CLOUD_ENV_ID } from "./config/cloud";
import {
  getCloudErrorMessage,
  isCloudSetupError,
} from "./services/cloud-client";
// 预加载扫码相关模块，避免开发者工具未注册新服务文件
import "./services/scanner";
import "./services/catalog-service";

App({
  async onLaunch() {
    wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true });
    try {
      await sessionState.bootstrap();
      if (sessionState.needsOnboarding) {
        await wx.redirectTo({ url: "/pages/onboarding/index" });
      }
    } catch (error) {
      const message = getCloudErrorMessage(error);
      console.error("会话初始化失败", { message });
      if (isCloudSetupError(message)) {
        wx.showModal({
          title: "云服务尚未就绪",
          content: "请先创建或选择 CloudBase 环境，并部署 api 云函数后重新编译。",
          showCancel: false,
        });
      } else {
        wx.showToast({ title: "登录失败，请稍后重试", icon: "none" });
      }
    }
  },
});
