export const SITE = 'Track the Gap';
export const TAGLINE = 'Live London Underground Headways & Service Health';

export const HOME_DESCRIPTION =
  'Live headways, service gaps and train bunching on every London Underground line, worked out ' +
  'from TfL arrival predictions and compared against the timetable.';

export const lineDescription = (name: string): string =>
  `Live ${name} line headways: how evenly trains are actually running right now, section by ` +
  `section, with service gaps, bunching and TfL's official status side by side.`;

export const lineTitle = (name: string): string =>
  `${name} Line - Live Headways & Service Health | ${SITE}`;

export const homeTitle = `${SITE} - ${TAGLINE}`;

interface Crumb {
  name: string;
  path: string;
}

export const jsonLd = (origin: string, crumbs: Crumb[]) =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#site`,
        name: SITE,
        description: HOME_DESCRIPTION,
        url: origin
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: `${origin}${crumb.path}`
        }))
      }
    ]
  });
