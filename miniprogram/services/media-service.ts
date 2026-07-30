/** 新建物品前尚无 itemId，商品图先落到家庭草稿路径。 */
export function buildDraftProductImagePath(input: {
  householdId: string;
  requestId: string;
  timestamp?: number;
  extension?: string;
}): string {
  const timestamp = input.timestamp ?? Date.now();
  const extension = (input.extension ?? "jpg").replace(/^\./, "").toLowerCase();
  return `households/${input.householdId}/drafts/${input.requestId}/product/${timestamp}.${extension}`;
}

export async function chooseProductImage(): Promise<string> {
  const result = await wx.chooseMedia({
    count: 1,
    mediaType: ["image"],
    sourceType: ["album", "camera"],
    sizeType: ["compressed"],
  });
  const file = result.tempFiles && result.tempFiles[0];
  if (!file || !file.tempFilePath) {
    throw new Error("未选择图片");
  }
  return file.tempFilePath;
}

export async function uploadProductImage(input: {
  householdId: string;
  requestId: string;
  localPath: string;
}): Promise<string> {
  const extension = guessExtension(input.localPath);
  const cloudPath = buildDraftProductImagePath({
    householdId: input.householdId,
    requestId: input.requestId,
    extension,
  });
  const uploaded = await wx.cloud.uploadFile({
    cloudPath,
    filePath: input.localPath,
  });
  if (!uploaded.fileID) {
    throw new Error("图片上传失败");
  }
  return uploaded.fileID;
}

function guessExtension(localPath: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(localPath);
  if (!match || !match[1]) return "jpg";
  const extension = match[1].toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "heic"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  return "jpg";
}
