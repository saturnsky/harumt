export function isBunVirtualPath(path: string): boolean {
  return path.startsWith("/$bunfs/") || /^[A-Za-z]:[/\\]~BUN[/\\]/i.test(path);
}
