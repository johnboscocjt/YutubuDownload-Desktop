const RAW_BASE =
  "https://raw.githubusercontent.com/johnboscocjt/Youtube-Downloader-For-UbuntuTerminal/main/";

/** Normalize repo markdown for in-app rendering. */
export function prepareDocMarkdown(content: string): string {
  return content
    .replace(/\]\((Screenshots\/[^)]+)\)/gi, (_, path: string) => `](${RAW_BASE}${path})`)
    .replace(/src="(Screenshots\/[^"]+)"/gi, (_, path: string) => `src="${RAW_BASE}${path}"`);
}
