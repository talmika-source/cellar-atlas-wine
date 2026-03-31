import { PrismaClient, AssetType, JobStatus, TaskPriority, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.alert.deleteMany();
  await prisma.task.deleteMany();
  await prisma.meetingBrief.deleteMany();
  await prisma.newsItem.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.jobOpportunity.deleteMany();
  await prisma.company.deleteMany();

  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: "Apex Horizon",
        domain: "apexhorizon.ai",
        industry: "Enterprise AI",
        location: "New York, NY",
        description: "Operating system for enterprise decision intelligence."
      }
    }),
    prisma.company.create({
      data: {
        name: "Northstar Capital",
        domain: "northstarcap.com",
        industry: "Private Equity",
        location: "London, UK",
        description: "Mid-market investment platform focused on digital transformation."
      }
    }),
    prisma.company.create({
      data: {
        name: "Helio Health",
        domain: "heliohealth.io",
        industry: "Digital Health",
        location: "Boston, MA",
        description: "Data-rich care coordination software for hospital systems."
      }
    })
  ]);

  const [apex, northstar, helio] = companies;

  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        name: "Lauren Miles",
        role: "Chief People Officer",
        companyId: apex.id,
        email: "lauren@apexhorizon.ai",
        linkedin: "https://linkedin.com/in/lauren-miles",
        notes: "Warm intro via board advisor."
      }
    }),
    prisma.contact.create({
      data: {
        name: "Daniel Ross",
        role: "Managing Partner",
        companyId: northstar.id,
        email: "daniel@northstarcap.com",
        linkedin: "https://linkedin.com/in/daniel-ross",
        notes: "Interested in operating partner profile."
      }
    }),
    prisma.contact.create({
      data: {
        name: "Maya Chen",
        role: "VP Strategy",
        companyId: helio.id,
        email: "maya@heliohealth.io",
        linkedin: "https://linkedin.com/in/maya-chen",
        notes: "Meeting after healthcare summit."
      }
    })
  ]);

  await prisma.jobOpportunity.createMany({
    data: [
      {
        title: "Chief of Staff to CEO",
        companyId: apex.id,
        location: "New York, NY",
        status: JobStatus.OUTREACH,
        salaryRange: "$240k - $280k + equity",
        notes: "Board-aligned operating role with international exposure."
      },
      {
        title: "Operating Partner",
        companyId: northstar.id,
        location: "London, UK",
        status: JobStatus.RESEARCHING,
        salaryRange: "$300k + carry",
        notes: "Potential fit for portfolio operations transformation."
      },
      {
        title: "SVP Strategic Initiatives",
        companyId: helio.id,
        location: "Boston, MA",
        status: JobStatus.INTERVIEW,
        salaryRange: "$260k - $320k",
        notes: "Panel interview next week."
      },
      {
        title: "COO",
        companyId: apex.id,
        location: "Remote",
        status: JobStatus.NEW,
        salaryRange: "$340k - $420k",
        notes: "Stealth search through executive recruiter."
      }
    ]
  });

  await prisma.asset.createMany({
    data: [
      { symbol: "BTC", type: AssetType.CRYPTO, price: "67210.12", change24h: "2.84" },
      { symbol: "ETH", type: AssetType.CRYPTO, price: "3524.43", change24h: "1.32" },
      { symbol: "AAPL", type: AssetType.STOCK, price: "211.48", change24h: "-0.72" },
      { symbol: "USD/ILS", type: AssetType.FX, price: "3.6800", change24h: "0.18" },
      { symbol: "EUR/USD", type: AssetType.FX, price: "1.0890", change24h: "-0.11" }
    ]
  });

  await prisma.newsItem.createMany({
    data: [
      {
        title: "Apex Horizon expands EMEA advisory council",
        source: "ExecWire",
        url: "https://example.com/apex-horizon-emea",
        companyId: apex.id,
        publishedAt: new Date("2026-03-14T09:00:00.000Z")
      },
      {
        title: "Northstar Capital closes growth fund oversubscribed",
        source: "Market Brief",
        url: "https://example.com/northstar-growth-fund",
        companyId: northstar.id,
        publishedAt: new Date("2026-03-13T11:15:00.000Z")
      },
      {
        title: "Helio Health launches payer analytics suite",
        source: "HealthTech Daily",
        url: "https://example.com/helio-health-analytics",
        companyId: helio.id,
        publishedAt: new Date("2026-03-15T07:45:00.000Z")
      }
    ]
  });

  await prisma.meetingBrief.createMany({
    data: [
      {
        companyId: apex.id,
        summary: "Apex Horizon is scaling go-to-market leadership while tightening enterprise AI compliance positioning.",
        keyPoints: [
          "Recent expansion into EMEA enterprise accounts",
          "Board focus on operational cadence and forecast rigor",
          "Executive team values cross-functional transformation leadership"
        ]
      },
      {
        companyId: helio.id,
        summary: "Helio Health is balancing product expansion with hospital procurement cycles and payer data partnerships.",
        keyPoints: [
          "Healthcare provider retention remains strong",
          "Strategic initiatives role will bridge product, finance, and partnerships",
          "Expect questions about change management in regulated environments"
        ]
      }
    ]
  });

  await prisma.task.createMany({
    data: [
      {
        title: "Prep Apex outreach follow-up",
        description: "Draft message highlighting global operating experience.",
        priority: TaskPriority.HIGH,
        dueDate: new Date("2026-03-18T09:00:00.000Z"),
        status: TaskStatus.TODO,
        linkedCompanyId: apex.id,
        linkedContactId: contacts[0].id
      },
      {
        title: "Review Northstar portfolio thesis",
        description: "Read fund letter and prep diligence questions.",
        priority: TaskPriority.MEDIUM,
        dueDate: new Date("2026-03-20T14:00:00.000Z"),
        status: TaskStatus.DOING,
        linkedCompanyId: northstar.id,
        linkedContactId: contacts[1].id
      },
      {
        title: "Finalize Helio interview brief",
        description: "Turn speaking notes into one-page narrative.",
        priority: TaskPriority.HIGH,
        dueDate: new Date("2026-03-17T16:00:00.000Z"),
        status: TaskStatus.DONE,
        linkedCompanyId: helio.id,
        linkedContactId: contacts[2].id
      }
    ]
  });

  await prisma.alert.createMany({
    data: [
      {
        type: "price",
        threshold: "BTC > 70000",
        message: "Review profit-taking strategy if BTC trades above target."
      },
      {
        type: "job",
        threshold: "New C-level role",
        message: "Trigger outreach prep when a new COO or Chief of Staff role is added."
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
