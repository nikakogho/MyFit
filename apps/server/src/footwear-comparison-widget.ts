export const footwearComparisonWidgetHtml = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
          sans-serif;
        --bg: #101012;
        --panel: #1b1b1f;
        --panel-strong: #242429;
        --text: #f7f5f2;
        --muted: #b7b2bc;
        --line: #39383f;
        --accent: #9b6cff;
        --accent-soft: rgba(155, 108, 255, 0.18);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
      }

      button {
        color: inherit;
        font: inherit;
      }

      .shell {
        min-width: 0;
        padding: 16px;
      }

      .eyebrow {
        margin: 0 0 6px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1,
      h2,
      p {
        margin-top: 0;
      }

      h1 {
        margin-bottom: 14px;
        font-size: clamp(20px, 4vw, 30px);
        line-height: 1.1;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(180px, 0.8fr) minmax(260px, 1.2fr);
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: var(--panel);
      }

      .trouser-reference {
        display: grid;
        grid-template-rows: minmax(260px, 1fr) auto;
        border-right: 1px solid var(--line);
      }

      .trouser-art {
        display: grid;
        min-height: 300px;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 50% 22%, rgba(155, 108, 255, 0.14), transparent 42%),
          #151518;
      }

      .trouser-art svg {
        width: min(72%, 220px);
        height: auto;
        filter: drop-shadow(0 20px 30px rgba(0, 0, 0, 0.35));
      }

      .reference-copy,
      .winner-copy {
        padding: 20px;
      }

      .reference-copy h2,
      .winner-copy h2 {
        margin-bottom: 8px;
        font-size: 19px;
      }

      .reference-copy p,
      .winner-copy p {
        margin-bottom: 0;
        color: var(--muted);
        line-height: 1.55;
      }

      .winner {
        display: grid;
        grid-template-rows: minmax(300px, 1fr) auto;
      }

      .winner-media {
        position: relative;
        height: clamp(320px, 48vw, 500px);
        min-height: 340px;
        overflow: hidden;
        background: #e9e7e3;
      }

      .winner-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .image-fallback {
        display: none;
        width: 100%;
        min-height: 340px;
        place-items: center;
        color: #4e4a55;
        font-weight: 750;
        text-align: center;
      }

      .badge {
        position: absolute;
        top: 16px;
        right: 16px;
        padding: 7px 11px;
        border-radius: 999px;
        background: rgba(16, 16, 18, 0.9);
        color: white;
        font-size: 13px;
        font-weight: 800;
        backdrop-filter: blur(8px);
      }

      .winner-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .winner-heading .rank {
        color: var(--accent);
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .tip {
        margin-top: 16px;
        padding: 14px 16px;
        border-left: 3px solid var(--accent);
        border-radius: 0 14px 14px 0;
        background: var(--accent-soft);
        color: var(--text) !important;
      }

      .list-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin: 22px 0 10px;
      }

      .list-header h2 {
        margin: 0;
        font-size: 18px;
      }

      .list-header span {
        color: var(--muted);
        font-size: 13px;
      }

      .ranking {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 10px;
      }

      .shoe-card {
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr);
        gap: 12px;
        min-width: 0;
        padding: 0;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--panel);
        text-align: left;
        cursor: pointer;
        transition:
          border-color 150ms ease,
          transform 150ms ease,
          background 150ms ease;
      }

      .shoe-card:hover,
      .shoe-card:focus-visible {
        border-color: var(--accent);
        outline: none;
        transform: translateY(-1px);
      }

      .shoe-card.active {
        border-color: var(--accent);
        background: var(--panel-strong);
        box-shadow: 0 0 0 2px var(--accent-soft);
      }

      .shoe-card img {
        width: 72px;
        height: 100%;
        min-height: 108px;
        object-fit: cover;
        background: #e9e7e3;
      }

      .card-copy {
        min-width: 0;
        padding: 12px 12px 12px 0;
      }

      .card-topline {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }

      .card-title {
        overflow: hidden;
        font-weight: 750;
        line-height: 1.25;
        text-overflow: ellipsis;
      }

      .card-score {
        flex: none;
        color: var(--accent);
        font-size: 13px;
        font-weight: 800;
      }

      .card-brand {
        margin-top: 5px;
        color: var(--muted);
        font-size: 13px;
      }

      .empty {
        padding: 28px;
        border: 1px dashed var(--line);
        border-radius: 16px;
        color: var(--muted);
        text-align: center;
      }

      @media (prefers-color-scheme: light) {
        :root {
          --bg: #ffffff;
          --panel: #f7f6f8;
          --panel-strong: #efebf7;
          --text: #18161b;
          --muted: #66616c;
          --line: #d9d5dd;
          --accent: #7043ce;
          --accent-soft: rgba(112, 67, 206, 0.11);
        }

        .trouser-art {
          background:
            radial-gradient(circle at 50% 22%, rgba(112, 67, 206, 0.12), transparent 42%),
            #f1eff3;
        }
      }

      @media (max-width: 640px) {
        .shell {
          padding: 10px;
        }

        .hero {
          grid-template-columns: 1fr;
        }

        .trouser-reference {
          grid-template-columns: 0.8fr 1.2fr;
          grid-template-rows: auto;
          border-right: 0;
          border-bottom: 1px solid var(--line);
        }

        .trouser-art {
          min-height: 210px;
          padding: 16px;
        }

        .winner-media,
        .winner-media img,
        .image-fallback {
          min-height: 300px;
        }
      }
    </style>
  </head>
  <body>
    <main id="root" class="shell">
      <div class="empty">Preparing your MyFit comparison…</div>
    </main>
    <script>
      const root = document.getElementById("root");
      let currentData = null;
      let selectedIndex = 0;

      function textElement(tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = value || "";
        return element;
      }

      function imageElement(src, alt, className) {
        const image = document.createElement("img");
        image.src = src;
        image.alt = alt;
        image.className = className || "";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => {
          image.style.display = "none";
          const fallback = image.nextElementSibling;
          if (fallback) fallback.style.display = "grid";
        });
        return image;
      }

      function trouserSvg(style) {
        const cargoPockets =
          style === "cargo"
            ? '<rect x="32" y="84" width="32" height="42" rx="5" fill="#25252a" stroke="#56545e"/><rect x="96" y="84" width="32" height="42" rx="5" fill="#25252a" stroke="#56545e"/>'
            : "";
        const legSpread = style === "wide-leg" ? 8 : style === "slim" ? -7 : 0;
        return '<svg viewBox="0 0 160 260" role="img" aria-label="Generic dark trouser silhouette">' +
          '<defs><linearGradient id="fabric" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#34343a"/><stop offset="1" stop-color="#111114"/></linearGradient></defs>' +
          '<path d="M31 18 Q80 4 129 18 L124 70 L' + (113 + legSpread) + ' 242 Q99 252 83 243 L78 130 L72 243 Q56 252 42 242 L' + (36 - legSpread) + ' 70 Z" fill="url(#fabric)" stroke="#65636d" stroke-width="2"/>' +
          '<path d="M36 70 Q80 78 124 70" fill="none" stroke="#5d5a64" stroke-width="2"/>' +
          '<path d="M80 13 L78 130" fill="none" stroke="#4c4a52" stroke-width="1.5"/>' +
          cargoPockets +
          '<rect x="29" y="16" width="102" height="14" rx="6" fill="#202025" stroke="#5d5a64"/>' +
          '</svg>';
      }

      function renderWinner(entry, data) {
        const winner = document.createElement("section");
        winner.className = "winner";

        const media = document.createElement("div");
        media.className = "winner-media";
        const image = entry.garment.images[0];
        media.append(
          imageElement(image.src, image.alt),
          textElement("div", "image-fallback", entry.garment.name),
          textElement("span", "badge", entry.score + " / 100"),
        );

        const copy = document.createElement("div");
        copy.className = "winner-copy";
        const heading = document.createElement("div");
        heading.className = "winner-heading";
        const headingText = document.createElement("div");
        headingText.append(
          textElement("div", "rank", selectedIndex === 0 ? "Best current pairing" : "Rank " + entry.rank),
          textElement(
            "h2",
            "",
            (entry.garment.brand ? entry.garment.brand + " " : "") + entry.garment.name,
          ),
        );
        heading.append(headingText);
        copy.append(heading, textElement("p", "", entry.rationale));
        if (entry.stylingTip) {
          copy.append(textElement("p", "tip", "How to wear it: " + entry.stylingTip));
        }
        winner.append(media, copy);
        return winner;
      }

      function render(data) {
        if (!data || !Array.isArray(data.rankedFootwear) || data.rankedFootwear.length === 0) {
          root.replaceChildren(textElement("div", "empty", "No footwear comparison was returned."));
          return;
        }

        currentData = data;
        selectedIndex = Math.min(selectedIndex, data.rankedFootwear.length - 1);
        const selected = data.rankedFootwear[selectedIndex];

        const eyebrow = textElement("p", "eyebrow", "MyFit wardrobe comparison");
        const title = textElement("h1", "", "What works with " + data.trouserName + "?");

        const hero = document.createElement("div");
        hero.className = "hero";
        const reference = document.createElement("section");
        reference.className = "trouser-reference";
        const art = document.createElement("div");
        art.className = "trouser-art";
        art.innerHTML = trouserSvg(data.trouserStyle);
        const referenceCopy = document.createElement("div");
        referenceCopy.className = "reference-copy";
        referenceCopy.append(
          textElement("h2", "", "Generic trouser reference"),
          textElement("p", "", data.trouserDescription),
        );
        reference.append(art, referenceCopy);
        hero.append(reference, renderWinner(selected, data));

        const listHeader = document.createElement("div");
        listHeader.className = "list-header";
        listHeader.append(
          textElement("h2", "", "Your ranked footwear"),
          textElement("span", "", "Select a pair to inspect"),
        );

        const ranking = document.createElement("div");
        ranking.className = "ranking";
        data.rankedFootwear.forEach((entry, index) => {
          const card = document.createElement("button");
          card.type = "button";
          card.className = "shoe-card" + (index === selectedIndex ? " active" : "");
          card.setAttribute("aria-label", "Show rank " + entry.rank + ": " + entry.garment.name);
          const cardImage = entry.garment.images[0];
          const copy = document.createElement("div");
          copy.className = "card-copy";
          const topLine = document.createElement("div");
          topLine.className = "card-topline";
          topLine.append(
            textElement("div", "card-title", entry.rank + ". " + entry.garment.name),
            textElement("div", "card-score", String(entry.score)),
          );
          copy.append(
            topLine,
            textElement("div", "card-brand", entry.garment.brand || "Brand not recorded"),
          );
          card.append(imageElement(cardImage.src, cardImage.alt), copy);
          card.addEventListener("click", () => {
            selectedIndex = index;
            render(currentData);
          });
          ranking.append(card);
        });

        root.replaceChildren(eyebrow, title, hero, listHeader, ranking);
        window.openai?.notifyIntrinsicHeight?.(document.documentElement.scrollHeight);
      }

      window.addEventListener(
        "message",
        (event) => {
          if (event.source !== window.parent) return;
          const message = event.data;
          if (message?.jsonrpc !== "2.0") return;
          if (message.method === "ui/notifications/tool-result") {
            render(message.params?.structuredContent);
          }
        },
        { passive: true },
      );

      render(window.openai?.toolOutput);
    </script>
  </body>
</html>
`.trim();
