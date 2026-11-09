import { headers } from "next/headers";

export const toSafePath = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  try {
    // relative path from query param (recommended)
    if (value.startsWith("/")) {
      return value;
    }

    // absolute URL from Referer header
    const parsedUrl = new URL(value);
    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return null;
  }
};

export async function getBackUrl(): Promise<string | null> {
  const headerList = await headers();
  const referer = headerList.get("referer");
  const safePath = toSafePath(referer);
  // get current url
  const currentUrl = toSafePath(headerList.get("x-invoke-path"));
  // if safe path without query params is the same as the current URL, return "/"
  if (safePath && currentUrl) {
    const safePathWithoutQuery = safePath.split("?")[0];
    const currentUrlWithoutQuery = currentUrl.split("?")[0];
    if (safePathWithoutQuery === currentUrlWithoutQuery) {
      return null;
    }
  }
  return safePath ?? null;
}
