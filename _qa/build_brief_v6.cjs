const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType } = require('docx');
const OUT = process.argv[2];
const PAGE = { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } };
const styles = {
  default: { document: { run: { font: 'Arial', size: 23 } } },
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: 'Arial', color: '1F3864' }, paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 0 } },
  ],
};
const numbering = { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] }] };
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const P = (t) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun(t)] });
const LI = (lead, rest) => new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 70 }, children: rest ? [new TextRun({ text: lead, bold: true }), new TextRun(rest)] : [new TextRun(lead)] });
const children = [
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Carease Health — Warehouse (WMS)', bold: true, size: 24, color: '2E5496' })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'Simple Update Brief', bold: true, size: 40, color: '1F3864' })] }),
  new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'A plain-language summary of where the app stands · 2026-06-25', italics: true, size: 22, color: '595959' })] }),
  P('Here is a quick, no-jargon summary of the latest changes and what is ready to use.'),

  H1('Two bugs fixed'),
  LI('Sales orders now create a shipment. ', 'Confirming a sales order adds it to the shipping queue — before, confirming did nothing.'),
  LI('Stock counts are accurate. ', 'Available units now read correctly, so editing an order no longer falsely says "out of stock" and pushes things to back order.'),

  H1('Purchase Orders'),
  LI('Bundles start collapsed. ', 'A group line opens closed; click to see what is inside.'),
  LI('A $ by the deposit, and the next payment pre-fills. ', 'The remaining balance is filled in for you and stays editable.'),
  LI('"Bill us" on a landed cost. ', 'When the vendor invoices you for an extra cost (e.g. higher shipping), tick "bill us" and it is added to what you owe them.'),

  H1('Sales Orders'),
  LI('Pick the exact units to ship. ', 'Choose specific carts/laptops, capped at what is in the warehouse, and pick New vs Refurbished carts.'),
  LI('Send hides after received; Print always works. ', 'There is no reason to send an order once it has been received.'),

  H1('Assemblies (carts)'),
  LI('Build many at once. ', 'A "Build multiple" screen lets you add a row per cart (code / colour / tablet number) and build them all together.'),
  LI('Clear type selection + auto-fill from inventory. ', 'You pick which cart you are building, and its details fill in from the parts inside it.'),

  H1('Carts & Refurbished'),
  LI('Returned carts become Refurbished. ', 'A returned cart comes back as a separate Refurbished item in its own pool — a new order never shows a refurbished cart.'),
  LI('Refurbished value. ', 'Set from a simple credit rate (default 80%) you can change on the Returns page; we swap it for your real formula when you have it.'),

  H1('Inventory'),
  LI('Filters. ', 'Filter the list by single items, grouped items, carts available, or low stock.'),
  LI('Master-group flag. ', 'A full-cart group can be marked "ship only as an assembly," while its individual parts can still ship loose.'),

  H1('Fresh data for testing (new)'),
  LI('Empty orders to start. ', 'The app now opens with no Purchase Orders, Sales Orders, or Returns so you can enter your own. Your inventory, assets, vendors, and facilities are kept.'),

  H1('Earlier in this version'),
  P('The company asset register (all your equipment in one place), the Equipment Map of your sites, add/edit and pagination across the assets, and a switch at the top that hides the "new" notes so you can preview the finished product.'),

  H1('The bottom line'),
  P('It is all built, checked (12 automated test suites, 392 checks, zero failures), and working. If anything needs adjusting, just let us know.'),
];
const doc = new Document({ styles, numbering, sections: [{ properties: { page: PAGE }, children }] });
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT + '/Warehouse WMS - Simple Update Brief.docx', b); console.log('wrote Simple Update Brief (V6)'); });
