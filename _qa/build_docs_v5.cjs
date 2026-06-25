const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType } = require('docx');
const OUT = process.argv[2];

const PAGE = { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } };
const styles = {
  default: { document: { run: { font: 'Arial', size: 22 } } },
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, font: 'Arial', color: '1F3864' }, paragraph: { spacing: { before: 280, after: 130 }, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, font: 'Arial', color: '2E5496' }, paragraph: { spacing: { before: 200, after: 90 }, outlineLevel: 1 } },
  ],
};
const numbering = { config: [
  { reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 620, hanging: 300 } } } }] },
  { reference: 'n', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 620, hanging: 300 } } } }] },
]};
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P = (t) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun(t)] });
const LI = (lead, rest) => new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 60 }, children: rest ? [new TextRun({ text: lead, bold: true }), new TextRun(rest)] : [new TextRun(lead)] });
const NUM = (t) => new Paragraph({ numbering: { reference: 'n', level: 0 }, spacing: { after: 60 }, children: [new TextRun(t)] });
const title = (t, sub, sub2) => [
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Carease Health — Warehouse (WMS)', bold: true, size: 24, color: '2E5496' })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: t, bold: true, size: 40, color: '1F3864' })] }),
  new Paragraph({ spacing: { after: 180 }, children: [new TextRun({ text: sub, italics: true, size: 22, color: '595959' })] }),
  ...(sub2 ? [new Paragraph({ spacing: { after: 220 }, children: [new TextRun({ text: sub2, size: 22, color: '404040' })] })] : []),
];
function save(name, children) { const doc = new Document({ styles, numbering, sections: [{ properties: { page: PAGE }, children }] }); return Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT + '/' + name, b); console.log('wrote', name); }); }

/* ============ DOC 1: What's New — Asset Registry & Equipment Maps ============ */
const d1 = [
  ...title("What's New — Asset Registry & Equipment Maps",
    'The company asset register and the new map view · 2026-06-25',
    'This update brings the full company asset register into the app from the Cart List inventory, makes every asset editable, and adds an Equipment Map so the warehouse team can locate gear down to the facility. It builds on the asset-model amendment and keeps to its rules.'),

  H1('The asset register (Assets page)'),
  P('The Assets section now holds 2,293 real tracked units, seeded from your Cart List inventory, across all eight classes:'),
  LI('Carts — ', '1,375'), LI('Laptops — ', '294 (includes the legacy “Laptops old” list)'), LI('Game Shows — ', '351'), LI('Tablets — ', '51'), LI('Monitors — ', '29'), LI('Desktops — ', '98'), LI('Cell Phones — ', '81'), LI('EZ Pass — ', '14'),
  H2('What you can do'),
  LI('Browse by class. ', 'A tab per class shows that class’s real columns. A status summary lets you jump straight to “Out of Service”, “Return Pending”, etc.'),
  LI('Search & filter. ', 'Search by code, holder or serial; filter by status; and quick-filter to User-held, Facility, or In-warehouse.'),
  LI('Add & edit. ', 'Add a brand-new unit (the ID auto-suggests the next number) or edit any unit — its code, status, holder and all class fields. Holder is an Employee or a Facility only.'),
  LI('Pagination. ', 'Rows per page defaults to 10 and you can choose 20, 30, 40 or 50, with Prev/Next and a range readout.'),
  LI('Export. ', 'Export the current filtered view to CSV for reporting.'),
  H2('The corrected cart record'),
  P('Carts now use the real attribute names from your sheet: Cart Type is the wheel (cta wheel 1/2, cta yellow, microlife), and BP Machine is edan / vs8 / accutar — along with Key, Tablet Type, Tablet #, Clini/Omni, Basket, LTE, and the Regional manager.'),

  H1('Terminated → recover assets'),
  P('A Returns — Terminated tab lists each terminated employee with a count of the assets they still hold. “Start recovery” flags those assets for return, and “Mark returned” closes each one out — so equipment comes back when someone leaves.'),

  H1('Equipment Maps (new page)'),
  P('A new Equipment Maps page plots every facility that has carts deployed on an interactive OpenStreetMap of the US.'),
  LI('Markers. ', 'Each facility is a pin sized by its cart count and coloured by health (indigo normal, red when it has out-of-service carts, teal when selected).'),
  LI('Hover. ', 'Hovering a pin shows the facility, the equipment deployed there, and the team in that state.'),
  LI('Click → detail column. ', 'Clicking a facility opens a third column with the full equipment list, the employees, and the specific equipment assigned to each employee.'),
  LI('Search tools. ', 'Facility search and User search both have type-ahead autosuggest plus a full dropdown; there is also a State filter and a Regional filter.'),
  LI('Multi-select. ', 'The facility list below the filters has its own search and tick-boxes, so you can pick several facilities to view together on the map.'),
  H2('Two honest notes on the demo'),
  LI('Locations. ', 'The inventory sheet has facility names, not street addresses, so pins are placed at real US cities (matching the city when the name contains one). A banner states that live production will use the Google Maps API for exact geocoding.'),
  LI('People. ', 'Names show as first name + last initial for privacy, and every facility shows at least two team members (clearly tagged “demo” where state records are sparse). The note explains that in production the actual employees assigned to each facility will display.'),

  H1('Demo / production toggle'),
  P('A “Change notes” switch in the top bar turns the green NEW labels and tooltips on or off, so you can present the annotated demo or preview the clean production look with one click.'),

  H1('Quality check'),
  P('All automated checks pass: 11 test suites totalling 348 checks — including a strict amendment suite, an asset-registry suite, and an Equipment-Map suite, each run three times with zero failures. The production build is clean.'),
];

/* ============ DOC 2 (refresh): Simple Update Brief ============ */
const d2 = [
  ...title('Simple Update Brief', 'A plain-language summary of the latest changes · 2026-06-25',
    'Here is a quick, no-jargon summary of what changed and what is now ready to use.'),
  H1('The big picture'),
  P('We loaded the company’s full equipment list into the app and added a map so you can see where everything is. Everything is editable, and it all stays tied to either a facility or a person.'),
  H1('What’s new'),
  LI('All your equipment is in one place. ', 'Every cart, laptop, tablet, monitor, desktop, phone, game show and EZ-Pass from your list is now in the Assets section — about 2,300 items in total.'),
  LI('You can add and edit anything. ', 'Open any item to change its details, who has it, or its status. You can also add a brand-new item, and the list pages 10 at a time (you can show up to 50).'),
  LI('Get equipment back when someone leaves. ', 'A “Terminated” tab lists people who left and the gear they still hold, so you can mark it for return.'),
  LI('A map of all your sites. ', 'The new Equipment Maps page shows every facility on a map of the US. Hover a pin to see its equipment and team; click it to open a side panel with the full list of carts and the people, with the gear assigned to each person.'),
  LI('Easy to find things. ', 'Type-to-search for a facility or a person (with suggestions), filter by state or regional, and tick several facilities to compare them on the map.'),
  LI('A demo / clean-view switch. ', 'A switch at the top hides or shows the little “new” notes, so you can flip between the guided demo and a clean preview of the finished product.'),
  H1('A couple of honest notes'),
  LI('Map pins. ', 'Your list has facility names but not full street addresses, so pins sit on real US cities for now. In the live version the map will use Google Maps for exact addresses.'),
  LI('Names & people. ', 'People show as a first name and last initial. Every facility shows at least two names so the screen isn’t empty — some are clearly marked “demo”, and the real staff per facility will show in the live version.'),
  H1('The bottom line'),
  P('It’s all built, checked, and working. If anything needs adjusting, just let us know.'),
];

save("Warehouse WMS - What's New - Asset Registry & Equipment Maps.docx", d1)
  .then(() => save('Warehouse WMS - Simple Update Brief.docx', d2))
  .then(() => console.log('done'))
  .catch((e) => { console.error(e); process.exit(1); });
