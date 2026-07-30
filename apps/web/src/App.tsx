import { useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import type { Catalog, Garment, Outfit } from "@myfit/contracts";

const categories = ["all", "outerwear", "footwear"] as const;

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="MyFit home">
      MY<span>FIT</span>
    </Link>
  );
}

function Header() {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="Main navigation">
        <a href="/#wardrobe">Wardrobe</a>
        <a href="/#outfits">Outfits</a>
        <a href="/#profile">Fit profile</a>
      </nav>
      <div className="public-pill">
        <i aria-hidden="true" />
        Public wardrobe
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer>
      <Brand />
      <p>Real clothes. Useful context. Better outfit suggestions.</p>
      <a href="/api/catalog">Public JSON</a>
      <a href="/mcp">MCP endpoint</a>
    </footer>
  );
}

function GarmentCard({ garment, index }: { garment: Garment; index: number }) {
  const image = garment.images[0];
  if (!image) return null;
  return (
    <Link className="garment-card" to={`/garments/${garment.id}`}>
      <div className="card-image">
        <span className="item-number">0{index + 1}</span>
        <img src={image.src} alt={image.alt} width={image.width} height={image.height} />
        <span className="view-item">View item ↗</span>
      </div>
      <div className="card-copy">
        <div>
          <p className="eyebrow">{garment.category}</p>
          <h3>{garment.name}</h3>
        </div>
        <p>{garment.brand}</p>
      </div>
      <div className="color-row">
        {garment.colors.map((color) => (
          <span key={color}>{color}</span>
        ))}
      </div>
    </Link>
  );
}

function OutfitFeature({ outfit, catalog }: { outfit: Outfit; catalog: Catalog }) {
  const pieces = outfit.garmentIds
    .map((id) => catalog.garments.find((garment) => garment.id === id))
    .filter((garment): garment is Garment => Boolean(garment));
  return (
    <Link className="outfit-feature" to={`/outfits/${outfit.id}`}>
      <div className="outfit-images">
        {pieces.map((piece, index) => {
          const image = piece.images[0];
          return image ? (
            <img
              key={piece.id}
              className={`outfit-image outfit-image-${index + 1}`}
              src={image.src}
              alt={image.alt}
            />
          ) : null;
        })}
        <span className="plus-mark">+</span>
      </div>
      <div className="outfit-copy">
        <p className="eyebrow">Saved direction · 001</p>
        <h2>{outfit.title}</h2>
        <p>{outfit.rationale}</p>
        <div className="outfit-tags">
          {outfit.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <strong>
          Open the outfit direction <span>↗</span>
        </strong>
      </div>
    </Link>
  );
}

function Home({ catalog }: { catalog: Catalog }) {
  const [category, setCategory] = useState<(typeof categories)[number]>("all");
  const [query, setQuery] = useState("");
  const garments = useMemo(
    () =>
      catalog.garments.filter((garment) => {
        const matchesCategory = category === "all" || garment.category === category;
        const text = [
          garment.name,
          garment.brand,
          garment.colors.join(" "),
          garment.searchTerms.join(" "),
        ]
          .join(" ")
          .toLocaleLowerCase();
        return matchesCategory && text.includes(query.toLocaleLowerCase());
      }),
    [catalog.garments, category, query],
  );
  const jacket = catalog.garments[0]?.images[0];
  const sneaker = catalog.garments[1]?.images[0];

  return (
    <>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="kicker">A wardrobe with context</p>
            <h1>
              Dress with
              <br />
              <em>what you own.</em>
            </h1>
            <p className="intro">
              A small, public inventory built to help an AI stylist suggest outfits from real
              clothes—not an imaginary closet.
            </p>
            <a className="primary-link" href="#wardrobe">
              Explore the wardrobe <span>↓</span>
            </a>
          </div>
          <div className="hero-art" aria-label="Wardrobe highlights">
            <div className="shape shape-one" />
            <div className="shape shape-two" />
            {jacket ? <img className="hero-jacket" src={jacket.src} alt={jacket.alt} /> : null}
            {sneaker ? <img className="hero-sneaker" src={sneaker.src} alt={sneaker.alt} /> : null}
            <div className="context-note">
              <b>{String(catalog.garments.length).padStart(2, "0")}</b>
              <span>Pieces indexed with fit, colour &amp; styling context</span>
            </div>
          </div>
        </section>

        <section className="manifesto">
          <p>THE IDEA</p>
          <blockquote>
            “Outfit advice gets better when the stylist knows the <em>actual wardrobe.</em>”
          </blockquote>
          <div className="manifesto-note">
            <span>↳</span>
            <p>Every piece is described, searchable, and openly available to ChatGPT.</p>
          </div>
        </section>

        <section className="wardrobe-section" id="wardrobe">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The wardrobe</p>
              <h2>Current pieces</h2>
            </div>
            <label className="search">
              <span>⌕</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search colour, item, brand…"
                aria-label="Search wardrobe"
              />
            </label>
          </div>
          <div className="filter-row" aria-label="Filter by category">
            {categories.map((item) => (
              <button
                className={item === category ? "active" : ""}
                type="button"
                key={item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {garments.length > 0 ? (
            <div className="garment-grid">
              {garments.map((garment, index) => (
                <GarmentCard key={garment.id} garment={garment} index={index} />
              ))}
            </div>
          ) : (
            <p className="empty-state">Nothing in the wardrobe matches that search yet.</p>
          )}
        </section>

        <section className="outfits-section" id="outfits">
          <div className="section-heading light">
            <div>
              <p className="eyebrow">Put it together</p>
              <h2>Outfit directions</h2>
            </div>
            <p>
              Built from pieces that are actually here, with honest notes about what is missing.
            </p>
          </div>
          {catalog.outfits.map((outfit) => (
            <OutfitFeature key={outfit.id} outfit={outfit} catalog={catalog} />
          ))}
        </section>

        <section className="profile-section" id="profile">
          <div>
            <p className="eyebrow">The fit profile</p>
            <h2>Context, not commandments.</h2>
            <p>{catalog.profile.publicNotice}</p>
          </div>
          <dl>
            <div>
              <dt>Clothing</dt>
              <dd>{catalog.profile.typicalClothingSize}</dd>
            </div>
            <div>
              <dt>Shoes</dt>
              <dd>{catalog.profile.shoeSize}</dd>
            </div>
            <div>
              <dt>Height</dt>
              <dd>≈ {catalog.profile.heightCmApprox} cm</dd>
            </div>
            <div>
              <dt>Context</dt>
              <dd>{catalog.profile.locationContext}</dd>
            </div>
          </dl>
        </section>
      </main>
    </>
  );
}

function GarmentDetail({ catalog }: { catalog: Catalog }) {
  const { id } = useParams();
  const garment = catalog.garments.find((item) => item.id === id);
  if (!garment) return <Navigate to="/" replace />;
  return (
    <main className="detail-page">
      <Link className="back-link" to="/#wardrobe">
        ← Back to wardrobe
      </Link>
      <div className="detail-layout">
        <div className="detail-gallery">
          {garment.images.map((image) => (
            <img key={image.src} src={image.src} alt={image.alt} />
          ))}
        </div>
        <aside className="detail-copy">
          <p className="eyebrow">
            {garment.category} · {garment.subcategory}
          </p>
          <h1>{garment.name}</h1>
          <p className="detail-brand">{garment.brand}</p>
          <p className="detail-lede">
            {garment.colorDescription}. {garment.silhouette}.
          </p>
          <dl className="detail-list">
            <div>
              <dt>Colours</dt>
              <dd>{garment.colors.join(", ")}</dd>
            </div>
            <div>
              <dt>Materials</dt>
              <dd>{garment.materials.join(", ")}</dd>
            </div>
            <div>
              <dt>Fit</dt>
              <dd>{garment.fit ?? "Not recorded yet"}</dd>
            </div>
            <div>
              <dt>Best seasons</dt>
              <dd>{garment.seasons.join(", ")}</dd>
            </div>
          </dl>
          <div className="styling-box">
            <p className="eyebrow">Styling notes</p>
            <ul>
              {garment.stylingNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function OutfitDetail({ catalog }: { catalog: Catalog }) {
  const { id } = useParams();
  const outfit = catalog.outfits.find((item) => item.id === id);
  if (!outfit) return <Navigate to="/" replace />;
  const pieces = outfit.garmentIds
    .map((garmentId) => catalog.garments.find((item) => item.id === garmentId))
    .filter((garment): garment is Garment => Boolean(garment));
  return (
    <main className="detail-page outfit-detail">
      <Link className="back-link" to="/#outfits">
        ← Back to outfit directions
      </Link>
      <p className="eyebrow">Saved outfit direction</p>
      <h1>{outfit.title}</h1>
      <p className="outfit-rationale">{outfit.rationale}</p>
      <div className="outfit-piece-grid">
        {pieces.map((piece, index) => (
          <GarmentCard garment={piece} index={index} key={piece.id} />
        ))}
      </div>
      <div className="complete-look">
        <div>
          <p className="eyebrow">Complete the look</p>
          <h2>Bring these from outside the indexed wardrobe</h2>
        </div>
        <ol>
          {outfit.missingPieces.map((piece) => (
            <li key={piece}>{piece}</li>
          ))}
        </ol>
      </div>
    </main>
  );
}

export function App({ catalog }: { catalog: Catalog }) {
  return (
    <div className="app-shell">
      <Header />
      <Routes>
        <Route path="/" element={<Home catalog={catalog} />} />
        <Route path="/garments/:id" element={<GarmentDetail catalog={catalog} />} />
        <Route path="/outfits/:id" element={<OutfitDetail catalog={catalog} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  );
}
