export interface DefaultCategory {
  key:
    | "food"
    | "medicine"
    | "beauty"
    | "digital"
    | "appliance"
    | "household_supply"
    | "document_service"
    | "other";
  name: string;
  icon: string;
  color: string;
  defaultThresholdDays: number;
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  {
    key: "food",
    name: "食品饮料",
    icon: "food",
    color: "#E98A5F",
    defaultThresholdDays: 7,
  },
  {
    key: "medicine",
    name: "药品保健",
    icon: "medicine",
    color: "#D56F6F",
    defaultThresholdDays: 7,
  },
  {
    key: "beauty",
    name: "美妆个护",
    icon: "beauty",
    color: "#C9819F",
    defaultThresholdDays: 7,
  },
  {
    key: "digital",
    name: "数码产品",
    icon: "digital",
    color: "#4F7E9D",
    defaultThresholdDays: 30,
  },
  {
    key: "appliance",
    name: "家用电器",
    icon: "appliance",
    color: "#4F8B72",
    defaultThresholdDays: 30,
  },
  {
    key: "household_supply",
    name: "家庭耗材",
    icon: "household-supply",
    color: "#A77A52",
    defaultThresholdDays: 7,
  },
  {
    key: "document_service",
    name: "证件与服务",
    icon: "document-service",
    color: "#6C7293",
    defaultThresholdDays: 30,
  },
  {
    key: "other",
    name: "其他",
    icon: "other",
    color: "#747B74",
    defaultThresholdDays: 7,
  },
] as const;
