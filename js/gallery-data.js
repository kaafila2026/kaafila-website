// Kaafila 2026 — gallery photos.
//
// TO ADD PHOTOS
// 1. Put the image files in img/gallery/  (jpg, keep them under ~400 KB each;
//    around 1600px on the long edge is plenty for the grid and lightbox).
// 2. Add one entry per photo below.
//
// Fields
//   src      — path to the image, e.g. "img/gallery/clash-of-bands-01.jpg"
//   category — one of: music | dance | visual | theatre   (drives the filter
//              buttons; omit for a photo that should only show under "All")
//   caption  — short label shown over the tile and under the lightbox. Keep it
//              to a few words; long captions cover the photo.
//   alt      — optional fuller description for screen readers. Falls back to
//              caption when omitted, so write it whenever the caption alone
//              would not tell someone what is in the photo.
//
// The page renders straight from this list: the grid, the category filters
// and the lightbox all read it, and the "photos coming soon" note hides
// itself as soon as there is at least one entry here. Nothing else needs to
// change when photos are added.

const KAAFILA_GALLERY = [
  {
    src: "img/gallery/kaafila-entrance.jpg",
    caption: "Senior Block entrance",
    alt: "Visitors arriving through the Senior Block corridor, under the Kaafila banner and rows of paper bunting",
  },
  {
    src: "img/gallery/vocal-performance-stage.jpg",
    category: "music",
    caption: "Vocal solo",
    alt: "A vocalist performing under blue stage light, one hand cupped to the ear",
  },
  {
    src: "img/gallery/vocal-performance-hall.jpg",
    category: "music",
    caption: "Centre stage",
    alt: "A vocalist alone in the spotlight at the far end of the hall, the audience filming from the dark",
  },
  {
    src: "img/gallery/vocal-performance-silhouette.jpg",
    category: "music",
    caption: "Backlit",
    alt: "A vocalist mid-set, lit from behind against the darkened hall",
  },
  {
    src: "img/gallery/food-stall-daryaganj.jpg",
    caption: "Daryaganj stall",
    alt: "A visitor talking with a vendor at the Daryaganj food stall, brass warmers laid out along the counter",
  },
  {
    src: "img/gallery/clash-of-bands-vocalist.jpg",
    category: "music",
    caption: "Guitar and vocals",
    alt: "A performer singing into the mic while playing a white electric guitar, the audience silhouetted in the foreground",
  },
  {
    src: "img/gallery/kathak-solo.jpg",
    category: "dance",
    caption: "Kathak solo",
    alt: "A dancer mid-turn in a white and gold costume, skirt flaring, lit by a single spotlight",
  },
  {
    src: "img/gallery/one-act-play-ensemble.jpg",
    category: "theatre",
    caption: "Hands raised",
    alt: "The full cast on stage with arms lifted, silhouetted against a projected sunrise",
  },
  {
    src: "img/gallery/physical-theatre-ensemble.jpg",
    category: "theatre",
    caption: "Ensemble scene",
    alt: "A cast dressed in black moving together under blue light in a tightly choreographed scene",
  },
  {
    src: "img/gallery/canvas-painting-workshop.jpg",
    category: "visual",
    caption: "Canvas painting",
    alt: "Two students painting white birds onto a black canvas, paints and a loaded palette spread across the table",
  },
];
