import { getRequestConfig } from "next-intl/server";
import { routing, type Locale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  const [common, auth, dashboard, project, profile, management] =
    await Promise.all([
      import(`../../messages/${locale}/common.json`),
      import(`../../messages/${locale}/auth.json`),
      import(`../../messages/${locale}/dashboard.json`),
      import(`../../messages/${locale}/project.json`),
      import(`../../messages/${locale}/profile.json`),
      import(`../../messages/${locale}/management.json`),
    ]);

  return {
    locale,
    messages: {
      common: common.default,
      auth: auth.default,
      dashboard: dashboard.default,
      project: project.default,
      profile: profile.default,
      management: management.default,
    },
  };
});
