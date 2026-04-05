export const APP_NAME = "Model Helper";
export const APP_TAGLINE = "Modeling for the rest of us.";

export function getPageTitle(pageTitle: string): string {
  return `${pageTitle} — ${APP_NAME}`;
}