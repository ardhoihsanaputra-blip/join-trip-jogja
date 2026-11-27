import fs from "node:fs";
import path from "node:path";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing");
}

const blogDir = path.resolve("blog");
fs.mkdirSync(blogDir, { recursive: true });

const TOPICS = [
  {
    slug: "merapi-glowing-lava-tour-tips-weather-safety",
    title: "Merapi Glowing Lava Tour Tips, Weather Reality and Safety from Yogyakarta",
    image: "/merapi-glowing-lava-tour-1.webp",
    focus: "Explain night pick-up at 07:00 PM, non-hiking viewpoint vs hiking >1,700 stairs, sharing transport, and why glowing lava sightings depend on weather and volcanic activity with no guarantee."
  },
  {
    slug: "jomblang-cave-and-pindul-tubing-guide-jogja",
    title: "Jomblang Vertical Cave and Pindul Cave Tubing Guide from Yogyakarta",
    image: "/jomblang-cave-tour-jogja-1.webp",
    focus: "Explain morning 07:00 AM departure, vertical descent gear and safety rules at Jomblang, river tubing at Pindul, lunch inclusion, and what to pack."
  },
  {
    slug: "borobudur-climb-up-access-monday-closure-guide",
    title: "Borobudur Climb-Up Access Guide and What to Know About Monday Closures",
    image: "/borobudur-sunrise-tour-jogja.webp",
    focus: "Explain sunrise 03:30 AM pick-up, Upanat sandals, official local guide (Pamong Carita), and why Borobudur climb-up access is closed every Monday for maintenance."
  },
  {
    slug: "foreigner-vs-local-tickets-jogja-temple-tours",
    title: "Planning a Mixed Group Tour in Yogyakarta: Foreigner and Local Ticket Rules",
    focus: "Explain how groups with both international visitors and Indonesian residents can plan temple itineraries and transparent per-person pricing using the mixed group calculator."
  },
  {
    slug: "best-time-to-visit-borobudur-and-prambanan",
    title: "Best Time of Year and Day to Visit Borobudur and Prambanan Temples",
    image: "/borobudur-sunrise-tour-jogja-1.webp",
    focus: "Compare dry vs rainy season in Yogyakarta, 03:30 AM sunrise vs 07:00-09:00 AM regular pick-up, crowd levels, and clothing recommendations."
  },
  {
    slug: "what-to-wear-and-bring-jogja-temple-cave-tours",
    title: "What to Wear and Bring for Yogyakarta Temple, Volcano and Cave Tours",
    image: "/jomblang-cave-tour-jogja.webp",
    focus: "Practical packing checklist covering temple dress etiquette, Upanat sandals at Borobudur, warm layers for Merapi at night, and spare clothes for Pindul Cave tubing."
  }
];

async function generateWithRetry(promptText, maxAttempts = 4) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    if (response.ok) {
      return response.json();
    }

    const errText = await response.text();
    const isRetryable = response.status === 503 || response.status === 429;

    if (!isRetryable || attempt === maxAttempts) {
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const waitMs = attempt * 3000;
    console.warn(`Attempt ${attempt} got ${response.status}. Retrying in ${waitMs / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

const existingFiles = new Set(fs.readdirSync(blogDir));
const nextTopic = TOPICS.find((t) => !existingFiles.has(`${t.slug}.html`));

if (nextTopic) {
  const todayISO = new Date().toISOString().split("T")[0];
  const prompt = `
Write a complete, helpful English travel blog post for Join Trip Jogja (https://jointripjogja.my.id/blog/${nextTopic.slug}.html).
Title: ${nextTopic.title}
Hero Image: ${nextTopic.image}
Publish Date: ${todayISO}
Focus: ${nextTopic.focus}

Strict Output & SEO Rules:
- Output ONLY valid HTML5 starting with <!DOCTYPE html> and ending with </html>. Do not wrap in markdown code fences.
- Use <html lang="en">, <meta name="viewport" content="width=device-width, initial-scale=1.0">, <title>${nextTopic.title} | Join Trip Jogja</title>, concise <meta name="description">, and <link rel="canonical" href="https://jointripjogja.my.id/blog/${nextTopic.slug}.html">.
- Include <link rel="icon" type="image/png" sizes="192x192" href="/logo.png"> and <link rel="preload" as="image" href="${nextTopic.image}" fetchpriority="high">.
- Do NOT load cdn.tailwindcss.com or external JS frameworks. Use clean embedded CSS with dark slate background (#020617 / #0f172a), crisp contrast, and underlined text links (#fde68a) so every link is distinguishable without hover.
- Include sticky top header with logo (/logo.png inside white circle badge), JOIN TRIP JOGJA brand link to /, and CTA button to /#booking.
- Include breadcrumb (<a href="/">Home</a> / <a href="/blog.html">Blog</a>), H1 title, publish date (${todayISO}), hero <img> with width="1200" height="630" fetchpriority="high" (NO loading="lazy"), structured H2 sections, practical tips, and a clear WhatsApp booking CTA linking to https://wa.me/6282227041521.
- Factual accuracy rules: Borobudur climb-up is closed every Monday for maintenance; Merapi glowing lava has NO GUARANTEE as it depends on weather and volcanic activity; pick-up times are Borobudur Sunrise 03:30 AM, Borobudur + Prambanan 07:00/08:00/09:00 AM, Cave tours 07:00 AM, Merapi Lava 07:00 PM.
`;

  const data = await generateWithRetry(prompt);
  let html = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  html = html.replace(/^```html\s*/i, "").replace(/```\s*$/i, "").trim();

  if (!html.startsWith("<!DOCTYPE html>") || !html.includes("</html>")) {
    throw new Error("Generated output is not a valid full HTML document.");
  }

  const outFile = path.join(blogDir, `${nextTopic.slug}.html`);
  fs.writeFileSync(outFile, html, "utf8");
  console.log(`Created ${outFile}`);
} else {
  console.log("All topics already generated. Rebuilding blog.html index only.");
}

const postFiles = fs
  .readdirSync(blogDir)
  .filter((f) => f.endsWith(".html"))
  .sort()
  .reverse();

const cardsHtml = postFiles
  .map((file) => {
    const content = fs.readFileSync(path.join(blogDir, file), "utf8");
    const titleMatch = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : file.replace(/\.html$/, "");
    const desc = descMatch ? descMatch[1].trim() : "Yogyakarta private tour guide and travel tips by Join Trip Jogja.";
    return `
      <article class="post-card">
        <h2><a href="/blog/${file}">${title}</a></h2>
        <p>${desc}</p>
        <a class="read-more" href="/blog/${file}">Read full guide →</a>
      </article>`;
  })
  .join("\n");

const blogIndexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Yogyakarta Travel Blog & Tour Guides | Join Trip Jogja</title>
<meta name="description" content="Travel tips, schedules, and practical guides for Borobudur Sunrise, Prambanan Temple, Merapi Glowing Lava, and Jomblang Cave tours in Yogyakarta.">
<link rel="canonical" href="https://jointripjogja.my.id/blog.html">
<link rel="icon" type="image/png" sizes="192x192" href="/logo.png">
<style>
*,::before,::after{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#020617;color:#f1f5f9;line-height:1.6}
a{color:#fde68a;text-decoration:underline;text-underline-offset:3px}
a:hover{color:#ffffff}
.header{background:rgba(2,6,23,.95);border-bottom:1px solid #1e293b;padding:14px 20px}
.header-inner{max-width:960px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:inline-flex;align-items:center;gap:10px;color:#fff;font-weight:800;text-decoration:none}
.logo-wrap{background:#fff;padding:2px;border-radius:9999px;display:inline-flex}
.logo-wrap img{width:34px;height:34px;border-radius:9999px;object-fit:cover;display:block}
.cta{background:#f59e0b;color:#020617;font-weight:800;padding:8px 16px;border-radius:10px;text-decoration:none;font-size:.875rem}
.container{max-width:960px;margin:0 auto;padding:36px 20px 64px}
h1{font-size:clamp(1.75rem,4vw,2.5rem);margin:0 0 10px;color:#fff}
.lead{color:#cbd5e1;margin:0 0 28px}
.grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.post-card{background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:22px;display:flex;flex-direction:column;justify-content:space-between}
.post-card h2{font-size:1.2rem;margin:0 0 10px}
.post-card p{color:#cbd5e1;font-size:.95rem;margin:0 0 16px}
.read-more{font-weight:700;font-size:.9rem}
.footer{border-top:1px solid #1e293b;padding:28px 20px;text-align:center;color:#cbd5e1;font-size:.875rem}
</style>
</head>
<body>
<header class="header">
  <div class="header-inner">
    <a href="/" class="brand">
      <span class="logo-wrap"><img src="/logo.png" alt="Join Trip Jogja logo" width="34" height="34"></span>
      <span>JOIN TRIP JOGJA</span>
    </a>
    <a href="/#booking" class="cta">Book Tour</a>
  </div>
</header>
<main class="container">
  <h1>Yogyakarta Travel Blog &amp; Tour Guides</h1>
  <p class="lead">Practical itineraries, pick-up schedules, and tips for Borobudur, Prambanan, Mount Merapi, and Jomblang Cave.</p>
  <div class="grid">
${cardsHtml}
  </div>
</main>
<footer class="footer">
  © 2026 Join Trip Jogja · <a href="/">Back to Home</a> · <a href="https://wa.me/6282227041521" target="_blank" rel="noopener">WhatsApp</a>
</footer>
</body>
</html>`;

fs.writeFileSync(path.resolve("blog.html"), blogIndexHtml, "utf8");
console.log("Updated blog.html index");
