import { onRequestGet as __api_pages__category____slug___ts_onRequestGet } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\pages\\[category]\\[[slug]].ts"
import { onRequestGet as __api_pages__category__ts_onRequestGet } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\pages\\[category].ts"
import { onRequestGet as __api_img___key___ts_onRequestGet } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\img\\[[key]].ts"
import { onRequestPost as __api_create_page_ts_onRequestPost } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\create-page.ts"
import { onRequestPost as __api_delete_page_ts_onRequestPost } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\delete-page.ts"
import { onRequestPost as __api_login_ts_onRequestPost } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\login.ts"
import { onRequestPost as __api_logout_ts_onRequestPost } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\logout.ts"
import { onRequestPost as __api_move_page_ts_onRequestPost } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\move-page.ts"
import { onRequestGet as __api_music_list_ts_onRequestGet } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\music-list.ts"
import { onRequestGet as __api_recent_ts_onRequestGet } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\recent.ts"
import { onRequestPost as __api_recent_ts_onRequestPost } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\recent.ts"
import { onRequestPost as __api_rename_page_ts_onRequestPost } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\rename-page.ts"
import { onRequestPost as __api_save_ts_onRequestPost } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\save.ts"
import { onRequestPost as __api_upload_image_ts_onRequestPost } from "D:\\MyProject\\blog\\.worktrees\\pixel-notes\\functions\\api\\upload-image.ts"

export const routes = [
    {
      routePath: "/api/pages/:category/:slug*",
      mountPath: "/api/pages/:category",
      method: "GET",
      middlewares: [],
      modules: [__api_pages__category____slug___ts_onRequestGet],
    },
  {
      routePath: "/api/pages/:category",
      mountPath: "/api/pages",
      method: "GET",
      middlewares: [],
      modules: [__api_pages__category__ts_onRequestGet],
    },
  {
      routePath: "/api/img/:key*",
      mountPath: "/api/img",
      method: "GET",
      middlewares: [],
      modules: [__api_img___key___ts_onRequestGet],
    },
  {
      routePath: "/api/create-page",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_create_page_ts_onRequestPost],
    },
  {
      routePath: "/api/delete-page",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_delete_page_ts_onRequestPost],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_ts_onRequestPost],
    },
  {
      routePath: "/api/logout",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_logout_ts_onRequestPost],
    },
  {
      routePath: "/api/move-page",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_move_page_ts_onRequestPost],
    },
  {
      routePath: "/api/music-list",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_music_list_ts_onRequestGet],
    },
  {
      routePath: "/api/recent",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_recent_ts_onRequestGet],
    },
  {
      routePath: "/api/recent",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_recent_ts_onRequestPost],
    },
  {
      routePath: "/api/rename-page",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_rename_page_ts_onRequestPost],
    },
  {
      routePath: "/api/save",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_save_ts_onRequestPost],
    },
  {
      routePath: "/api/upload-image",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_upload_image_ts_onRequestPost],
    },
  ]