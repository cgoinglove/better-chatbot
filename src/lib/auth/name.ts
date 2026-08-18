export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "";
}
