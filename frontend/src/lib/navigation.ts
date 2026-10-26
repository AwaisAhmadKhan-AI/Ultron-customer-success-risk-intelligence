import type { View } from "../types/app";

export function viewFromPath(pathname: string): View {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/accounts") return "accounts";
  if (path === "/tasks") return "tasks";
  if (path === "/documents-ai") return "ai";
  return "overview";
}

export function pathForView(view: View): string {
  switch (view) {
    case "accounts":
      return "/accounts";
    case "tasks":
      return "/tasks";
    case "ai":
      return "/documents-ai";
    default:
      return "/";
  }
}
