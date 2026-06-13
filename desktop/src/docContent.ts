/** Bundled screenshot URLs — import.meta.glob ensures Tauri embeds them in release builds. */
const screenshotModules = import.meta.glob("./assets/screenshots/desktop/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const screenshotByFile = new Map(
  Object.entries(screenshotModules).map(([modulePath, url]) => [
    modulePath.split("/").pop() ?? modulePath,
    url,
  ]),
);

function screenshotUrl(repoPath: string): string {
  const rel = repoPath.replace(/^Screenshots\//i, "");
  const fileName = rel.split("/").pop() ?? rel;
  return screenshotByFile.get(fileName) ?? `/screenshots/${rel}`;
}

/** Rewrite repo-relative screenshot paths to bundled in-app assets (works offline after .deb install). */
export function prepareDocMarkdown(content: string): string {
  return content
    .replace(/\]\((Screenshots\/[^)]+)\)/gi, (_, path: string) => `](${screenshotUrl(path)})`)
    .replace(/src="(Screenshots\/[^"]+)"/gi, (_, path: string) => `src="${screenshotUrl(path)}"`);
}
