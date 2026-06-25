const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType } = require('docx');
const OUT = process.argv[2];

const PAGE = { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } };
const styles = {
  default: { document: { run: { font: "Arial", size: 23 } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
      run: { size: 28, bold: true, font: "Arial", color: "1F3864" },
      paragraph: { spacing: { before: 260, after: 120 }, outlineLevel: 0 } },
  ],
};
const numbering = { config: [
  { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 600, hanging: 300 } } } }] },
]};
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const P  = (t) => new Paragraph({ spacing: { after: 140 }, children: [new TextRun(t)] });
const LI = (lead, rest) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 80 }, children: rest ? [new TextRun({ text: lead, bold: true }), new TextRun(rest)] : [new TextRun(lead)] });

const children = [
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Carease Health — Warehouse App", bold: true, size: 24, color: "2E5496" })] }),
  new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "Simple Update Brief", bold: true, size: 40, color: "1F3864" })] }),
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: "A plain-language summary of the latest changes · 2026-06-25", italics: true, size: 22, color: "595959" })] }),

  P("Here is a quick, no-jargon summary of what changed and what is now ready to use."),

  H1("The main idea"),
  P("We made the way the app tracks equipment simpler and clearer. From now on, only finished, built items count as tracked equipment. Loose parts sitting on the shelf are just stock."),

  H1("What changed"),
  LI("Finished items are the things we track. ", "A built cart, or a finished laptop or gameshow, is what the app keeps track of. Spare parts on the shelf are simply stock until they are used."),
  LI("Laptops and gameshows must be put together first. ", "They can no longer be sent out on their own. You first “build” them — which just means typing in their details (like memory, make, price, and serial number). This guarantees every one that leaves is tracked to a person."),
  LI("No more pop-up when stock arrives. ", "When deliveries come in, they simply go onto the shelf. You no longer get asked for equipment details at that moment — you add those later, when you build the item."),
  LI("Building a cart is unchanged and tidy. ", "Building a cart pulls its parts off the shelf and creates one tracked cart, filling in what it can automatically. Building a laptop or gameshow just means entering its info."),
  LI("We always know who has what. ", "When a cart ships, it is tied to the facility it goes to. When a laptop or gameshow ships, it is tied to the employee who receives it — so it is easy to find later."),

  H1("Smaller fixes you asked for"),
  LI("Bundles on a purchase order are now one line. ", "Set the quantity once and everything inside adjusts automatically."),
  LI("The deposit now calculates correctly. ", "It is worked out from the full bill total."),
  LI("Buttons tidy themselves up. ", "Once a deposit is recorded, that button disappears; once a bill is fully paid, the payment button disappears."),
  LI("A place to manage vendors. ", "You can update a vendor’s terms whenever you need to."),
  LI("Column headings stay put. ", "When you scroll your stock list, the headings stay visible at the top."),
  LI("Pick the exact item to send. ", "On a sales order you choose the specific built unit that goes out."),

  H1("The bottom line"),
  P("Everything above has been built, checked, and is working. If anything here needs adjusting, just let us know."),
];

const doc = new Document({ styles, numbering, sections: [{ properties: { page: PAGE }, children }] });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT + "/Warehouse WMS - Simple Update Brief.docx", buf); console.log("wrote Simple Update Brief", buf.length, "bytes"); });
