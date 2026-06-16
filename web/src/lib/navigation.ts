export let appNavigations = 0;
let lastKey: string | null = null;

export function trackNavigation(key: string) {
  if (key !== lastKey) {
    lastKey = key;
    appNavigations++;
  }
}
