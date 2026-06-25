const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType } = require('docx');

const OUT = process.argv[2];

const PAGE = { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } };
const styles = {
  default: { document: { run: { font: "Arial", size: 22 } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 30, bold: true, font: "Arial", color: "1F3864" },
      paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 25, bold: true, font: "Arial", color: "2E5496" },
      paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
  ],
};
const numbering = { config: [
  { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  { reference: "nums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
]};

const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const P  = (t) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun(t)] });
const B  = (runs) => new Paragraph({ spacing: { after: 120 }, children: runs });
const LI = (t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [new TextRun(t)] });
const LIb = (lead, rest) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: lead, bold: true }), new TextRun(rest)] });
const NUM = (t) => new Paragraph({ numbering: { reference: "nums", level: 0 }, spacing: { after: 60 }, children: [new TextRun(t)] });
const titleBlock = (title, sub, sub2) => [
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Carease Health — Warehouse (WMS)", bold: true, size: 24, color: "2E5496" })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: title, bold: true, size: 40, color: "1F3864" })] }),
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: sub, italics: true, size: 22, color: "595959" })] }),
  ...(sub2 ? [new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: sub2, size: 22, color: "404040" })] })] : []),
];

function save(name, children) {
  const doc = new Document({ styles, numbering, sections: [{ properties: { page: PAGE }, children }] });
  return Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT + "/" + name, buf); console.log("wrote", name, buf.length, "bytes"); });
}

const doc1 = [
  ...titleBlock("What’s New — Asset Model Amendment",
    "How the app now handles item types and assets · 2026-06-25",
    "This update refines how items become tracked assets, based on your latest request. It builds on Version 4 and changes a few of the rules V4 introduced. Everything below is built and verified."),
  H1("The big change, in one line"),
  P("Only assemblies become tracked assets now. A single item on its own is never an asset."),
  H1("What changed"),
  H2("1. A single item is never an asset"),
  P("A cable, a tablet, or a raw laptop sitting in stock is just inventory. None of these are tracked as assets on their own anymore."),
  H2("2. Laptops and Gameshows are “assembly-only”"),
  P("A laptop or gameshow is now treated as a one-item assembly. The raw item carries an “only ship as an assembly” flag, so it cannot be added to a Sales Order on its own. It must be assembled first — and for these, assembling simply means entering the unit’s info (RAM, make, price, serial)."),
  B([ new TextRun({ text: "Example: ", bold: true }), new TextRun("if you receive 20 laptops but assemble none of them, none can be shipped yet.") ]),
  H2("3. No more asset prompt at receiving"),
  P("When you receive a laptop, gameshow, or anything else, it simply moves into inventory. There is no pop-up asking for asset info at receiving. That info is captured later, at the assembly step."),
  H2("4. Two kinds of assembly"),
  LIb("Cart assembly (EDAN, VS8, Accutor) — ", "built from group items and single parts. The build screen shows the group items and auto-fills what it can (e.g. VS8 → Cart Type = CTA Cart, Key = CTA Key, BP = VS8); you fill in the rest (colour, tablet number). A Cart Code is required."),
  LIb("Single-item assembly (laptop, gameshow) — ", "no parts to put together. Assembling just records the unit’s info. A Unit Code is required."),
  H2("5. Parts vs. assembled units"),
  P("Parts in inventory are not assets. If you order 20 of every cart part and assemble 10 carts, you have 10 assembled carts (assets) plus 10 of each remaining part still in stock. Parts are not committed to a particular cart type until you actually assemble."),
  P("Marking an assembly as assembled removes its parts from inventory and creates exactly one asset with its fields filled in. Landed cost carries into the assembled unit, so it travels with the cart when it ships."),
  H2("6. Who owns it — filled at ship-out"),
  LIb("Carts → ", "assigned to the facility and Regional when shipped to a facility."),
  LIb("Laptops / Gameshows → ", "assigned to the employee they are shipped to, so you always know who has each unit for retrieval later."),
  H1("Also confirmed in this build (your re-listed items)"),
  LIb("Purchase Orders — ", "a group on a PO is now one line whose quantity scales every part inside, exactly like the Sales Order."),
  LIb("Purchase Orders — ", "the deposit calculates off the full bill total (100% of a $350 bill = $350)."),
  LIb("Purchase Orders — ", "Record Deposit disappears once a deposit is recorded; Record Payment disappears once the PO is fully paid."),
  LIb("Purchase Orders — ", "Manage Vendors lets you change an existing vendor’s terms and deposit rule."),
  LIb("Inventory — ", "the column-header row stays pinned while you scroll the items list."),
  LIb("Sales Orders — ", "add an assembly (cart, laptop, or gameshow) and pick the exact built unit to ship; assembly-only items can’t be added as loose items."),
  LIb("Sales Orders — ", "the “multiple vendors on one PO” feature is gone; a single SO can still pull together groups and assemblies whose parts originally came from different vendors."),
  H1("How to find it in the app"),
  P("Look for the small violet badges next to the relevant controls. Hover any badge to read the exact requirement it fulfils."),
  H1("Quality check"),
  P("All automated checks pass: 9 test suites totalling 270 checks — including a strict amendment suite (47 checks, run three times to confirm determinism) and a documentation-alignment suite (32 checks) — with zero failures. The production build is clean."),
];

const doc2 = [
  ...titleBlock("User Guide Addendum — Item Types & Assemblies",
    "Companion to the User Guide & Journeys · updated 2026-06-25",
    "This addendum reflects the latest asset rules. It replaces the earlier Version 4 addendum where the two differ — most importantly, single items are no longer treated as assets."),
  H1("The three item types"),
  LIb("Single — ", "one item (a cable, a tablet, a raw laptop). A single is never an asset. If an item must only leave the warehouse as part of an assembly (laptops, gameshows), tick “This item can only be shipped as an assembly” when you create it."),
  LIb("Group — ", "a bundle ordered or shipped together; never an asset. A group can contain singles and other groups."),
  LIb("Assembly — ", "the only thing that becomes a tracked asset. There are two kinds: a Cart (built from groups + singles) and a Single-item assembly (a laptop or gameshow, which has no parts — just its info)."),
  B([ new TextRun({ text: "Key rule: ", bold: true }), new TextRun("parts in inventory are not assets. An assembly becomes an asset only when you build it; building removes the parts and creates one tracked unit. A tablet built into a cart belongs to that cart — it is not a separate asset.") ]),
  H1("What’s new by screen"),
  H2("Inventory"),
  LIb("Add → Single / Group / Assembly. ", "A Single now has a “can only be shipped as an assembly” checkbox — use it for laptops and gameshows."),
  LIb("Define a Cart assembly. ", "Give it a name and cart type, add parts (groups and singles), and set the asset auto-fill defaults (Cart Type, Key Type, BP Device)."),
  LIb("Define a Single-item assembly. ", "Choose the source (assembly-only) item and list the info fields to capture at assembly (RAM, make, price, serial). There are no parts to add."),
  LIb("Carts tab — Build assembly. ", "For a cart, the asset fields auto-fill and the parts leave inventory. For a single-item, you just enter the info. A Cart/Unit Code is required either way. Edit a built unit, or Manage cart types, from here."),
  H2("Purchase Orders"),
  LI("No asset info is recorded at receiving — received items simply move into inventory. Asset info is entered later, at the assembly step."),
  H2("Sales Orders"),
  LIb("Ship a specific unit. ", "Add an assembly (e.g. “VS8 Cart”, or a laptop/gameshow) and, when you ship, pick exactly which built unit goes out. Assembly-only raw items cannot be added as loose lines."),
  LIb("Assignment by type. ", "A shipped cart is assigned to the facility and Regional; a shipped laptop or gameshow is assigned to the employee it goes to."),
  H1("Journey E — Define and build a cart"),
  NUM("Open Inventory ▸ + Add and choose Assembly ▸ Cart assembly."),
  NUM("Name it (e.g. “VS8 Cart”), pick a cart type, and add its parts — groups and singles."),
  NUM("Set the asset auto-fill defaults (Cart Type, Key Type, BP Device), then Save."),
  NUM("Go to Inventory ▸ Carts ▸ + Build assembly. Pick the assembly; the asset fields auto-fill."),
  NUM("Enter the required Cart Code (plus colour / tablet number), then Build. The parts leave inventory and one tracked cart asset is created in the warehouse."),
  H1("Journey F — Ship a built cart to a facility"),
  NUM("Open Sales Order ▸ + New SO and choose the facility."),
  NUM("In Items, search and add the assembly (e.g. “VS8 Cart”). Create the SO and Confirm it."),
  NUM("Click Ship. For the assembly line, tick which built cart(s) to send."),
  NUM("Ship. The chosen cart moves to the facility (assigned to the facility + Regional) and leaves the available pool; reversing returns it to the warehouse."),
  H1("Journey G — Build and ship a laptop (single-item assembly) to an employee"),
  NUM("Open Inventory ▸ + Add ▸ Assembly ▸ Single-item. Pick the laptop (its raw item is flagged assembly-only), list the info fields, and Save."),
  NUM("Go to Carts ▸ + Build assembly, pick the laptop assembly, enter the Unit Code plus RAM / make / price / serial, then Build. One laptop leaves stock and one tracked unit is created."),
  NUM("Open Sales Order ▸ + New SO for the employee and add the laptop assembly."),
  NUM("Click Ship, tick the specific built laptop unit, and Ship. The unit is assigned to that employee — visible under Assets ▸ User Assets."),
  B([ new TextRun({ text: "Tip: ", bold: true }), new TextRun("look for the violet badges next to these controls; hover any badge to read the exact requirement it fulfils.") ]),
];

save("Warehouse WMS - What's New - Asset Model Amendment.docx", doc1)
  .then(() => save("Warehouse WMS - User Guide Addendum (Item Types & Assemblies).docx", doc2))
  .then(() => console.log("done"))
  .catch(e => { console.error(e); process.exit(1); });
