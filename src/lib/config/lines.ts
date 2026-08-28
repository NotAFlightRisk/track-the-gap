export const LINE_IDS = [
  'bakerloo',
  'central',
  'circle',
  'district',
  'hammersmith-city',
  'jubilee',
  'metropolitan',
  'northern',
  'piccadilly',
  'victoria',
  'waterloo-city'
] as const;

export type LineId = (typeof LINE_IDS)[number];

export interface LineMeta {
  id: LineId;
  name: string;
  slug: string;
  colour: string;
  ink: string;
  opened: number;
  blurb: string;
}

/** Colours are TfL's own line palette; `ink` is what stays readable on top of it. */
export const LINES: LineMeta[] = [
  {
    id: 'bakerloo',
    name: 'Bakerloo',
    slug: 'bakerloo-line',
    colour: '#b36305',
    ink: '#ffffff',
    opened: 1906,
    blurb:
      'Harrow & Wealdstone to Elephant & Castle, sharing track with the London Overground north of Queen’s Park. A single route with no branches, so its headways read cleanly end to end.'
  },
  {
    id: 'central',
    name: 'Central',
    slug: 'central-line',
    colour: '#e32017',
    ink: '#ffffff',
    opened: 1900,
    blurb:
      'The longest line on the network, running West Ruislip and Ealing Broadway in the west to Epping and Hainault in the east. Four branches feed one very busy central trunk, so branch headways and trunk headways rarely tell the same story.'
  },
  {
    id: 'circle',
    name: 'Circle',
    slug: 'circle-line',
    colour: '#ffd300',
    ink: '#113b92',
    opened: 1884,
    blurb:
      'A spiral rather than a circle since 2009: Hammersmith round the Inner Circle and back. Almost every metre of it is shared with the District, Hammersmith & City or Metropolitan, which makes it the clearest example of combined corridor headway on the network.'
  },
  {
    id: 'district',
    name: 'District',
    slug: 'district-line',
    colour: '#00782a',
    ink: '#ffffff',
    opened: 1868,
    blurb:
      'The most branched line on the Underground, with Upminster, Ealing Broadway, Richmond, Wimbledon, Kensington (Olympia) and Edgware Road all served by different service patterns. Trains per hour on a branch can be a quarter of the trunk figure.'
  },
  {
    id: 'hammersmith-city',
    name: 'Hammersmith & City',
    slug: 'hammersmith-and-city-line',
    colour: '#f3a9bb',
    ink: '#113b92',
    opened: 1863,
    blurb:
      'Hammersmith to Barking, sharing track with the Circle, District and Metropolitan for most of its length. On its own it is infrequent; combined with the services beside it, the corridor is not.'
  },
  {
    id: 'jubilee',
    name: 'Jubilee',
    slug: 'jubilee-line',
    colour: '#a0a5a9',
    ink: '#113b92',
    opened: 1979,
    blurb:
      'Stanmore to Stratford, and the only line with platform edge doors along the whole eastern extension. Automatic train operation keeps its headways unusually tight, so a gap shows up quickly.'
  },
  {
    id: 'metropolitan',
    name: 'Metropolitan',
    slug: 'metropolitan-line',
    colour: '#9b0056',
    ink: '#ffffff',
    opened: 1863,
    blurb:
      'The world’s first underground railway, now running fast, semi-fast and all-stations services out to Amersham, Chesham, Watford and Uxbridge. Its fast trains skip stops, so headways at an intermediate station and at a trunk station diverge sharply.'
  },
  {
    id: 'northern',
    name: 'Northern',
    slug: 'northern-line',
    colour: '#000000',
    ink: '#ffffff',
    opened: 1890,
    blurb:
      'Two central branches, via Bank and via Charing Cross, two northern branches to Edgware and High Barnet, plus Mill Hill East and the Battersea extension. Effectively several railways sharing a name and a set of tunnels.'
  },
  {
    id: 'piccadilly',
    name: 'Piccadilly',
    slug: 'piccadilly-line',
    colour: '#003688',
    ink: '#ffffff',
    opened: 1906,
    blurb:
      'Cockfosters to Heathrow and Uxbridge, with the Heathrow loop making its western end genuinely one-way. It shares surface track with the District and Metropolitan for long stretches west of Acton Town.'
  },
  {
    id: 'victoria',
    name: 'Victoria',
    slug: 'victoria-line',
    colour: '#0098d4',
    ink: '#ffffff',
    opened: 1968,
    blurb:
      'Brixton to Walthamstow Central, no branches, fully automatic, and at peak the most frequent railway in the country at up to 36 trains an hour. A two minute headway is normal here and a four minute one is not.'
  },
  {
    id: 'waterloo-city',
    name: 'Waterloo & City',
    slug: 'waterloo-and-city-line',
    colour: '#95cdba',
    ink: '#113b92',
    opened: 1898,
    blurb:
      'Two stations, one tunnel, weekdays only. The Drain carries commuters between Waterloo and Bank and does nothing else, which makes its headway the simplest on the network to read.'
  }
];

const BY_ID = new Map(LINES.map((line) => [line.id, line]));
const BY_SLUG = new Map(LINES.map((line) => [line.slug, line]));

export const lineById = (id: string): LineMeta | undefined => BY_ID.get(id as LineId);
export const lineBySlug = (slug: string): LineMeta | undefined => BY_SLUG.get(slug);
