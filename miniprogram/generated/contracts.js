"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/contracts/src/index.ts
var src_exports = {};
__export(src_exports, {
  API_ACTIONS: () => API_ACTIONS
});
module.exports = __toCommonJS(src_exports);

// packages/contracts/src/actions.ts
var API_ACTIONS = [
  "session.bootstrap",
  "household.create",
  "household.list",
  "household.invite.create",
  "household.invite.accept",
  "household.member.list",
  "household.member.remove",
  "household.admin.transfer",
  "household.settings.update",
  "household.dissolve",
  "category.list",
  "category.save",
  "category.reorder",
  "location.list",
  "location.save",
  "item.create",
  "item.update",
  "item.list",
  "item.detail",
  "item.quantity.change",
  "item.process",
  "item.delete",
  "item.restore",
  "item.bulkMoveCategory",
  "catalog.lookup",
  "catalog.findMergeCandidate",
  "reminder.list",
  "reminder.markRead",
  "media.tempUrl",
  "account.export",
  "account.delete"
];
