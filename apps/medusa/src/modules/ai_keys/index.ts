import { Module } from "@medusajs/framework/utils";
import AiKeysModuleService from "./service";

export const AI_KEYS_MODULE = "ai_keys";

export default Module(AI_KEYS_MODULE, {
  service: AiKeysModuleService,
});
