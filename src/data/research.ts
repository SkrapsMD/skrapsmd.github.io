export interface Author {
  name: string
  slug?: string // slug = the #person-<slug> the author links to, if any
}

export interface PressLink {
  label: string
  url: string
}

export interface ResearchPaper {
  id: string // the card filename without extension, e.g. 'meyer2025tariffs'
  title: string
  authors: Author[] // in order; set slug when the author links to #person-<slug>
  venue?: string // journal / working-paper series if shown
  date?: string // date/year if shown
  abstract?: string // the abstract / blockquote text
  badges: string[] // topic tag labels
  pdfUrl?: string // "View PDF" style link
  doiUrl?: string // DOI link
  storySrc?: string // single Flourish embed src, if the story button uses data-story-src
  storyGroup?: string // key into storyGroups, if the button uses data-story-group
  bibtex?: string // the citation text carried in the cite button's data-citation
  press: PressLink[] // press-coverage links (label + url); [] if none
  group: string // section label from 02_research.html (e.g. 'Federal Reserve Bank of Atlanta')
}

export const research: ResearchPaper[] = [
  {
    id: 'baslandze2026ai',
    title: 'Artificial Intelligence, Productivity, and the Workforce: Evidence from Corporate Executives',
    authors: [
      { name: 'S. Baslandze', slug: 'salome-baslandze' },
      { name: 'Z. Edwards', slug: 'zachary-edwards' },
      { name: 'J. R. Graham', slug: 'john-graham' },
      { name: 'T. McClure', slug: 'ty-mcclure' },
      { name: 'B. Meyer', slug: 'brent-meyer' },
      { name: 'M. Sparks' },
      { name: 'S. R. Waddell', slug: 'sonya-waddell' },
      { name: 'D. Weitz', slug: 'daniel-weitz' },
    ],
    venue: 'NBER Working Paper No. w34984',
    date: 'Mar. 24, 2026',
    abstract:
      "We use novel data from a survey of nearly 750 corporate executives to study the effects of artificial intelligence (AI) on productivity and the workforce. We document substantial heterogeneity in AI adoption across firms, with more than half having already invested, though many smaller firms are only beginning to do so. Labor productivity gains are positive, vary across sectors, and are expected to strengthen in 2026, with the largest effects concentrated in high-skill services and finance. These gains are not primarily driven by firms' capital deepening but instead reflect increases in revenue-based total factor productivity, closely associated with innovation- and demand-oriented channels. We document a productivity paradox, in which perceived productivity gains are larger than measured productivity gains, likely reflecting a delay in revenue realizations. In labor markets, we find little evidence of near-term aggregate employment declines due to AI, though larger companies anticipate AI-driven workforce reductions, while smaller firms expect modest gains. We also find evidence of compositional reallocation of labor both within and across firms, with routine clerical roles declining and a relative demand for skilled technical roles increasing. We develop an index that ranks job functions most negatively affected by AI.",
    badges: ['Artificial Intelligence', 'Productivity', 'Labor Markets'],
    pdfUrl: '/docs/publications/ExecsAndAI_NBERwp34984.pdf',
    doiUrl: 'https://ssrn.com/abstract=6456970',
    storyGroup: 'baslandze2026ai',
    bibtex:
      '@techreport{baslandze2026ai,\n  title={Artificial Intelligence, Productivity, and the Workforce: Evidence from Corporate Executives},\n  author={Baslandze, Salome and Edwards, Zachary and Graham, John Robert and McClure, Ty and Meyer, Brent and Sparks, Michael and Waddell, Sonya Ravindranath and Weitz, Daniel},\n  institution={National Bureau of Economic Research},\n  series={NBER Working Paper},\n  number={w34984},\n  year={2026},\n  month={March},\n  url={https://ssrn.com/abstract=6456970},\n  note={Available at SSRN}\n}',
    press: [],
    group: 'Federal Reserve Bank of Atlanta',
  },
  {
    id: 'meyer2025tariffs',
    title: 'Will Tariffs Touch Off an Inflationary Impulse? Business Execs Think So',
    authors: [
      { name: 'B. Meyer', slug: 'brent-meyer' },
      { name: 'A. Jalca', slug: 'aaron-jalca' },
      { name: 'M. Sparks' },
      { name: 'D. Wiczer', slug: 'david-wiczer' },
    ],
    venue: "Federal Reserve Bank of Atlanta's Policy Hub",
    date: 'Aug. 24, 2025',
    abstract:
      "Following the inflationary surge from 2021 to 2023, which was touched off by supply chain constraints and shipping bottlenecks, we evaluate a new panel of own-firm price and unit cost growth expectations in the Atlanta Fed's Survey of Business Uncertainty for signs that the anticipated impactfrom tariffs is broadening beyond directlry affectedfirms. We find evidence for the potential of tariffs to touch off another bout of high inflation. First, firms that are directly exposed to tariffs have increased their year-ahead price growth expectations sharply (by 0.7 percentage points). Second, firms that are not directly exposed to tariffs but are operating in industries that are highly exposed to tariffs anticipate a moderately higher trajectory for year-ahead price growth (0.3 percentage points). Third, this broadening of overall price pressures --- a key feature of the pandemi-era inflationary impulse --- is only partially offset by lower price increases from tariff-exposed firms that are operating largely in industries not exposed to tariffs.",
    badges: ['Survey Methods', 'Trade Policy', 'Firm Behavior'],
    pdfUrl: '/docs/publications/TariffsInflationaryImpulse_No4_2025_FRBATL_PHUB.pdf',
    doiUrl: 'https://doi.org/10.29338/ph2025-04',
    storySrc: 'story/3246702?',
    bibtex:
      '@techreport{meyer2025tariffs,\n  title={Will Tariffs Touch Off an Inflationary Impulse? Business Execs Think So},\n  author={Meyer, Brent and Jalca, Aaron and Sparks, Michael Dwight and Wiczer, David},\n  institution={Federal Reserve Bank of Atlanta},\n  series={Policy Hub},\n  number={2025-04},\n  year={2025},\n  month={August},\n  doi={10.29338/ph2025-04}\n}',
    press: [{ label: 'CNN', url: 'https://www.cnn.com/2025/08/24/economy/us-tariffs-passthrough-consumers' }],
    group: 'Federal Reserve Bank of Atlanta',
  },
  {
    id: 'baslandze2025tariffs',
    title: 'Tariffs and Consumer Prices: Insights from Newly Matched Consumption-Trade Micro Data',
    authors: [
      { name: 'S. Baslandze', slug: 'salome-baslandze' },
      { name: 'S. Fuchs', slug: 'simon-fuchs' },
      { name: 'KC Pringle', slug: 'kc-pringle' },
      { name: 'M. Sparks' },
    ],
    venue: "Federal Reserve Bank of Atlanta's Policy Hub",
    date: 'Feb. 28, 2025',
    abstract:
      'We evaluate the impact of various US tariff scenarios on consumer prices using novel micro-level data linking imports to consumer expenditures. Results indicate that an additional 10 percent tariff on Chinese imports, 25 percent tariff on Canadianand Mexican imports, and 10 percent tariff on other countries could raise consumer prices on everyday retail purchases, such as food and beverage items and general merchandise, covering about a quarter of the total consumption basket, by 81 percent to 1.63 percent, assuming half to full pass-through. Notably, tariffs on Canada and Mexico contribute approximately 45 percent of the total price effect. Our results focus on direct effects of tariffs on a quarter of the total consumption basket, and the aggregate effect on the overall Consumer Price Index (CPI) further hinges on the price sensitivity of the excluded consumption categories, particularly transportation, services, energy, and housing.',
    badges: ['Inflation', 'Trade Policy', 'Industrial Organization'],
    pdfUrl: '/docs/publications/TariffsAndConsumerPrices_No1_2025_FRBATL_PHUB.pdf',
    doiUrl: 'https://doi.org/10.29338/ph2025-01',
    storySrc: 'story/2920835?1940038',
    bibtex:
      '@techreport{baslandze2025tariffs,\n  title={Tariffs and Consumer Prices: Insights from Newly Matched Consumption-Trade Micro Data},\n  author={Baslandze, Salome and Fuchs, Simon and Pringle, KC and Sparks, Michael Dwight},\n  institution={Federal Reserve Bank of Atlanta},\n  series={Policy Hub},\n  number={2025-01},\n  year={2025},\n  month={February},\n  doi={10.29338/ph2025-01}\n}',
    press: [
      {
        label: 'AJC',
        url: 'https://www.ajc.com/news/business/tariffs-will-raise-prices-its-just-a-matter-of-how-much-atlanta-fed-says/L3UXK5Z6UVG7DDF46XJOBCDKOA/',
      },
      {
        label: 'Reuters',
        url: 'https://www.reuters.com/business/trumps-tariff-blitz-prompts-firefighting-response-fed-researchers-2025-05-27/',
      },
      { label: 'CBS', url: 'https://www.cbsnews.com/news/trump-tariffs-what-will-cost-more-inflation/' },
      {
        label: 'Bloomberg',
        url: 'https://www.bloomberg.com/news/articles/2025-02-28/fed-paper-finds-tariffs-may-raise-us-consumers-everyday-costs',
      },
      {
        label: 'Breitbart',
        url: 'https://www.breitbart.com/economy/2025/03/03/new-fed-research-shows-modest-consumer-price-impact-from-proposed-tariffs/',
      },
    ],
    group: 'Federal Reserve Bank of Atlanta',
  },
  {
    id: 'fang2024labor',
    title: 'Labor Supply of Newly Immigrated Workers',
    authors: [
      { name: 'L. Fang', slug: 'lei-fang' },
      { name: 'M. Pitts', slug: 'melinda-pitts' },
      { name: 'M. Sparks' },
    ],
    venue: "Federal Reserve Bank of Atlanta's Policy Hub: Macroblog",
    date: 'Aug. 19, 2024',
    abstract:
      'How do newly immigrated workers compare to native born workers? This policy blog uses ACS (American Community Survey) data to investigate the potential macroeconomic effects of 2024 CBO (Congressional Budget Office) revisiont of immigration figures. When immigrants first arrive, they lag behind native born workers in Labor Force Participation Rate, Annual Hours worked, and average number of weeks worked. By their fifth year, these immigrants work as much as native workers, and by their 10th year they consistently out-work native born workers across time, and in all three measures.',
    badges: ['Employment', 'Immigration'],
    doiUrl:
      'https://www.atlantafed.org/research-and-data/publications/policy-hub-macroblog/2024/08/19/labor-supply-of-newly-immigrated-workers',
    bibtex:
      '@misc{fang2024labor,\n  title={Labor Supply of Newly Immigrated Workers},\n  author={Fang, Lei and Pitts, M. and Sparks, Michael Dwight},\n  year={2024},\n  month={August},\n  howpublished={Federal Reserve Bank of Atlanta Macroblog},\n  url={https://www.atlantafed.org/research-and-data/publications/policy-hub-macroblog/2024/08/19/labor-supply-of-newly-immigrated-workers}\n}',
    press: [
      {
        label: 'Breitbart',
        url: 'https://www.breitbart.com/economy/2024/08/20/breitbart-business-digest-natives-work-more-intensively-than-immigrants/',
      },
    ],
    group: 'Federal Reserve Bank of Atlanta',
  },
]
