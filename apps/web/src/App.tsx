import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import type { Catalog, Garment, Look, Outfit } from "@myfit/contracts";

const categories = [
  { value: "all", label: "all" },
  { value: "outerwear", label: "outerwear" },
  { value: "tops", label: "shirts" },
  { value: "bottoms", label: "trousers" },
  { value: "footwear", label: "footwear" },
] as const;

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
        <a href="/#looks">Looks</a>
        <a href="/#outfits">Ideas</a>
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

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function ImageLightbox({
  garmentName,
  images,
  index,
  onChange,
  onClose,
}: {
  garmentName: string;
  images: Garment["images"];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const image = images[index];
  const imageCount = images.length;
  const move = (direction: -1 | 1) => {
    onChange((index + direction + imageCount) % imageCount);
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onChange((index - 1 + imageCount) % imageCount);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onChange((index + 1) % imageCount);
      } else if (event.key === "Tab") {
        const controls = Array.from(
          dialogRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
        );
        const firstControl = controls[0];
        const lastControl = controls.at(-1);
        if (event.shiftKey && document.activeElement === firstControl) {
          event.preventDefault();
          lastControl?.focus();
        } else if (!event.shiftKey && document.activeElement === lastControl) {
          event.preventDefault();
          firstControl?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imageCount, index, onChange, onClose]);

  if (!image) return null;

  return (
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${garmentName} photo viewer`}
      ref={dialogRef}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const endX = event.changedTouches[0]?.clientX;
        if (touchStartX.current === null || endX === undefined) return;
        const distance = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(distance) >= 50) move(distance > 0 ? -1 : 1);
      }}
    >
      <button
        className="lightbox-close"
        type="button"
        aria-label="Close image viewer"
        onClick={onClose}
        ref={closeButtonRef}
      >
        ×
      </button>
      {imageCount > 1 ? (
        <button
          className="lightbox-arrow lightbox-previous"
          type="button"
          aria-label="Previous image"
          onClick={() => move(-1)}
        >
          ←
        </button>
      ) : null}
      <figure className="lightbox-stage">
        <img src={image.src} alt={image.alt} width={image.width} height={image.height} />
        <figcaption aria-live="polite">
          {String(index + 1).padStart(2, "0")} / {String(imageCount).padStart(2, "0")}
        </figcaption>
      </figure>
      {imageCount > 1 ? (
        <button
          className="lightbox-arrow lightbox-next"
          type="button"
          aria-label="Next image"
          onClick={() => move(1)}
        >
          →
        </button>
      ) : null}
    </div>
  );
}

function GarmentCard({ garment, index }: { garment: Garment; index: number }) {
  const image = garment.images[0];
  if (!image) return null;
  return (
    <Link className="garment-card" to={`/garments/${garment.id}`}>
      <div className="card-image">
        <span className="item-number">{String(index + 1).padStart(2, "0")}</span>
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

function garmentIdsForLook(look: Look) {
  return Array.from(new Set(look.images.flatMap((image) => image.garmentIds)));
}

function LookCard({
  look,
  catalog,
  selectedGarmentIds = [],
}: {
  look: Look;
  catalog: Catalog;
  selectedGarmentIds?: string[];
}) {
  const image =
    look.images.find((candidate) =>
      selectedGarmentIds.every((garmentId) => candidate.garmentIds.includes(garmentId)),
    ) ?? look.images[0];
  const pieces = garmentIdsForLook(look)
    .map((id) => catalog.garments.find((garment) => garment.id === id))
    .filter((garment): garment is Garment => Boolean(garment));

  if (!image) return null;

  return (
    <article className="look-card">
      <Link className="look-card-image" to={`/looks/${look.id}`}>
        <img src={image.src} alt={image.alt} width={image.width} height={image.height} />
        <span>{look.images.length} real-life photos</span>
      </Link>
      <div className="look-card-copy">
        <p className="eyebrow">Photographed look</p>
        <h3>
          <Link to={`/looks/${look.id}`}>{look.title}</Link>
        </h3>
        <p>{look.notes}</p>
        <div className="look-garments" aria-label="Indexed pieces in this look">
          {pieces.map((piece) => (
            <Link key={piece.id} to={`/garments/${piece.id}`}>
              {piece.name}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function LooksSection({ catalog }: { catalog: Catalog }) {
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const availableGarments = useMemo(
    () =>
      catalog.garments
        .filter((garment) => !selectedGarmentIds.includes(garment.id))
        .toSorted((left, right) => left.name.localeCompare(right.name)),
    [catalog.garments, selectedGarmentIds],
  );
  const looks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return catalog.looks.filter((look) => {
      const containsSelectedCombination = look.images.some((image) =>
        selectedGarmentIds.every((garmentId) => image.garmentIds.includes(garmentId)),
      );
      const linkedNames = garmentIdsForLook(look)
        .map((id) => catalog.garments.find((garment) => garment.id === id)?.name ?? "")
        .join(" ");
      const searchableText = [
        look.title,
        look.notes,
        look.occasions.join(" "),
        look.tags.join(" "),
        linkedNames,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return containsSelectedCombination && searchableText.includes(normalizedQuery);
    });
  }, [catalog.garments, catalog.looks, query, selectedGarmentIds]);

  const removeGarment = (garmentId: string) => {
    setSelectedGarmentIds((current) => current.filter((id) => id !== garmentId));
  };

  return (
    <section className="looks-section" id="looks">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Worn in real life</p>
          <h2>Photographed looks</h2>
        </div>
        <p>
          Find photos containing one piece, or keep adding pieces to require the exact combination.
        </p>
      </div>
      <div className="look-filter-panel">
        <label>
          <span>Filter by garment combination</span>
          <select
            aria-label="Add garment to look filter"
            value=""
            onChange={(event) => {
              const garmentId = event.target.value;
              if (garmentId) setSelectedGarmentIds((current) => [...current, garmentId]);
            }}
          >
            <option value="">Add a garment...</option>
            {availableGarments.map((garment) => (
              <option value={garment.id} key={garment.id}>
                {garment.name}
              </option>
            ))}
          </select>
        </label>
        <label className="look-query">
          <span>Search occasion or mood</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. casual, utility, evening"
            aria-label="Search photographed looks"
          />
        </label>
      </div>
      {selectedGarmentIds.length > 0 ? (
        <div className="selected-look-filters" aria-label="Required garment filters">
          {selectedGarmentIds.map((garmentId) => {
            const garment = catalog.garments.find((item) => item.id === garmentId);
            return garment ? (
              <button type="button" key={garmentId} onClick={() => removeGarment(garmentId)}>
                {garment.name} <span aria-hidden="true">x</span>
              </button>
            ) : null;
          })}
          <button
            className="clear-look-filters"
            type="button"
            onClick={() => setSelectedGarmentIds([])}
          >
            Clear garments
          </button>
        </div>
      ) : null}
      {looks.length > 0 ? (
        <div className="look-grid">
          {looks.map((look) => (
            <LookCard
              key={look.id}
              look={look}
              catalog={catalog}
              selectedGarmentIds={selectedGarmentIds}
            />
          ))}
        </div>
      ) : (
        <p className="empty-state">
          No photographed look contains that combination yet. ChatGPT can still build a new option
          from the individual wardrobe pieces.
        </p>
      )}
    </section>
  );
}

function Home({ catalog }: { catalog: Catalog }) {
  const [category, setCategory] = useState<(typeof categories)[number]["value"]>("all");
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
                className={item.value === category ? "active" : ""}
                type="button"
                key={item.value}
                onClick={() => setCategory(item.value)}
              >
                {item.label}
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

        <LooksSection catalog={catalog} />

        <section className="outfits-section" id="outfits">
          <div className="section-heading light">
            <div>
              <p className="eyebrow">New combinations</p>
              <h2>Outfit ideas</h2>
            </div>
            <p>
              Suggested combinations built from indexed pieces. These are ideas, not claims that the
              full combination has been photographed.
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
  const wornLooks = catalog.looks.filter((look) =>
    look.images.some((image) => image.garmentIds.includes(id ?? "")),
  );
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const imageTriggerRef = useRef<HTMLButtonElement | null>(null);
  if (!garment) return <Navigate to="/" replace />;

  const closeLightbox = useCallback(() => {
    setSelectedImageIndex(null);
    window.setTimeout(() => imageTriggerRef.current?.focus(), 0);
  }, []);

  return (
    <>
      <main className="detail-page">
        <Link className="back-link" to="/#wardrobe">
          ← Back to wardrobe
        </Link>
        <div className="detail-layout">
          <div className="detail-gallery">
            {garment.images.map((image, index) => (
              <button
                className="gallery-image-button"
                type="button"
                key={image.src}
                aria-label={`Open photo ${index + 1} of ${garment.images.length}`}
                onClick={(event) => {
                  imageTriggerRef.current = event.currentTarget;
                  setSelectedImageIndex(index);
                }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  loading={index > 1 ? "lazy" : "eager"}
                />
                <span aria-hidden="true">View larger</span>
              </button>
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
        {wornLooks.length > 0 ? (
          <section className="garment-look-links">
            <div className="section-heading">
              <div>
                <p className="eyebrow">See it worn</p>
                <h2>Photographed looks with this piece</h2>
              </div>
            </div>
            <div className="mini-look-grid">
              {wornLooks.map((look) => (
                <LookCard
                  key={look.id}
                  look={look}
                  catalog={catalog}
                  selectedGarmentIds={[garment.id]}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      {selectedImageIndex !== null ? (
        <ImageLightbox
          garmentName={garment.name}
          images={garment.images}
          index={selectedImageIndex}
          onChange={setSelectedImageIndex}
          onClose={closeLightbox}
        />
      ) : null}
    </>
  );
}

function LookDetail({ catalog }: { catalog: Catalog }) {
  const { id } = useParams();
  const look = catalog.looks.find((item) => item.id === id);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const imageTriggerRef = useRef<HTMLButtonElement | null>(null);
  if (!look) return <Navigate to="/" replace />;

  const pieces = garmentIdsForLook(look)
    .map((garmentId) => catalog.garments.find((item) => item.id === garmentId))
    .filter((garment): garment is Garment => Boolean(garment));
  const closeLightbox = () => {
    setSelectedImageIndex(null);
    window.setTimeout(() => imageTriggerRef.current?.focus(), 0);
  };

  return (
    <>
      <main className="detail-page look-detail">
        <Link className="back-link" to="/#looks">
          Back to photographed looks
        </Link>
        <div className="detail-layout">
          <div className="detail-gallery">
            {look.images.map((image, index) => (
              <button
                className="gallery-image-button"
                type="button"
                key={image.src}
                aria-label={`Open photo ${index + 1} of ${look.images.length}`}
                onClick={(event) => {
                  imageTriggerRef.current = event.currentTarget;
                  setSelectedImageIndex(index);
                }}
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  loading={index > 1 ? "lazy" : "eager"}
                />
                <span aria-hidden="true">View larger</span>
              </button>
            ))}
          </div>
          <aside className="detail-copy">
            <p className="eyebrow">Photographed look / {look.images.length} photos</p>
            <h1>{look.title}</h1>
            <p className="detail-lede">{look.notes}</p>
            <dl className="detail-list">
              <div>
                <dt>Best seasons</dt>
                <dd>{look.seasons.join(", ")}</dd>
              </div>
              <div>
                <dt>Occasions</dt>
                <dd>{look.occasions.join(", ")}</dd>
              </div>
              <div>
                <dt>Photo handling</dt>
                <dd>
                  {look.privacyTreatment === "as-is"
                    ? "Published as photographed"
                    : look.privacyTreatment}
                </dd>
              </div>
            </dl>
            {look.unindexedPieces.length > 0 ? (
              <div className="look-unindexed">
                <p className="eyebrow">Visible but not identified</p>
                <ul>
                  {look.unindexedPieces.map((piece) => (
                    <li key={piece}>{piece}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
        <section className="look-piece-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Exact indexed pieces</p>
              <h2>What is in this look</h2>
            </div>
          </div>
          <div className="garment-grid">
            {pieces.map((piece, index) => (
              <GarmentCard key={piece.id} garment={piece} index={index} />
            ))}
          </div>
        </section>
      </main>
      {selectedImageIndex !== null ? (
        <ImageLightbox
          garmentName={look.title}
          images={look.images}
          index={selectedImageIndex}
          onChange={setSelectedImageIndex}
          onClose={closeLightbox}
        />
      ) : null}
    </>
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
      <ScrollToTop />
      <Header />
      <Routes>
        <Route path="/" element={<Home catalog={catalog} />} />
        <Route path="/garments/:id" element={<GarmentDetail catalog={catalog} />} />
        <Route path="/looks/:id" element={<LookDetail catalog={catalog} />} />
        <Route path="/outfits/:id" element={<OutfitDetail catalog={catalog} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  );
}
