import type { ApiEnvelope } from "../../contracts/src/dto";
import { CategoryService } from "./categories/service";
import {
  ensureRequiredCollections,
  isMissingCollectionError,
} from "./cloud-setup";
import { ServiceError } from "./context";
import { HouseholdService, SessionService } from "./households/service";
import { LocationService } from "./locations/service";
import { ItemService } from "./items/service";
import {
  createCloudBaseRepositories,
  type CloudStore,
} from "./repositories";
import { fail } from "./result";
import { createRouter } from "./router";

interface CloudSdk {
  DYNAMIC_CURRENT_ENV: string;
  init(input: { env: string }): void;
  database(): CloudStore & {
    createCollection(name: string): Promise<unknown>;
  };
  getWXContext(): { OPENID?: string };
}

declare const require: (name: string) => unknown;

let runtime:
  | {
      cloud: CloudSdk;
      database: ReturnType<CloudSdk["database"]>;
      route: ReturnType<typeof createRouter>;
      session: SessionService;
    }
  | undefined;

function getRuntime() {
  if (runtime) return runtime;
  const cloud = require("wx-server-sdk") as CloudSdk;
  cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
  const database = cloud.database();
  const repos = createCloudBaseRepositories(database);
  const session = new SessionService(repos);
  const categories = new CategoryService(repos);
  runtime = {
    cloud,
    database,
    session,
    route: createRouter({
      session,
      households: new HouseholdService(repos),
      categories,
      locations: new LocationService(repos),
      items: new ItemService(repos),
    }),
  };
  return runtime;
}

async function execute(
  current: ReturnType<typeof getRuntime>,
  event: ApiEnvelope,
) {
  const openId = current.cloud.getWXContext().OPENID ?? "";
  const session = await current.session.bootstrap(openId);
  return current.route(
    { actor: { userId: session.user.id, openId } },
    event,
  );
}

function handleError(error: unknown) {
  if (error instanceof ServiceError) {
    return fail(error.code, error.message);
  }
  console.error("云函数请求失败", {
    message: error instanceof Error ? error.message : "未知错误",
  });
  return fail("INTERNAL_ERROR", "服务暂时不可用");
}

export async function main(event: ApiEnvelope) {
  const current = getRuntime();
  try {
    return await execute(current, event);
  } catch (error) {
    if (!isMissingCollectionError(error)) return handleError(error);
    try {
      await ensureRequiredCollections(current.database);
      return await execute(current, event);
    } catch (retryError) {
      return handleError(retryError);
    }
  }
}

export { createRouter } from "./router";
