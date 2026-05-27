/* =========================================================
   JAIME QUESADA PORTFOLIO
   Main JavaScript
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  initSmoothScroll();
  initProfileModal();
  initImageViewerModal();
  initImageCarousels();
});

/* =========================================================
   01. Smooth Scroll
========================================================= */

function initSmoothScroll() {
  const internalLinks = document.querySelectorAll('a[href^="#"]');

  internalLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") return;

      const targetSection = document.querySelector(targetId);

      if (!targetSection) return;

      event.preventDefault();

      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

/* =========================================================
   02. Profile Story Modal
   Loads content from json/profile-stories.json
========================================================= */

async function initProfileModal() {
  const cards = document.querySelectorAll("[data-profile-card]");
  const modalElement = document.getElementById("profileModal");

  if (!cards.length || !modalElement || typeof bootstrap === "undefined") return;

  const modalKicker = document.getElementById("profileModalKicker");
  const modalTitle = document.getElementById("profileModalTitle");
  const modalLead = document.getElementById("profileModalLead");
  const modalStory = document.getElementById("profileModalStory");
  const modalProof = document.getElementById("profileModalProof");

  let profileStories = {};

  try {
    const response = await fetch("json/profile-stories.json");

    if (!response.ok) {
      throw new Error("Could not load profile stories JSON.");
    }

    profileStories = await response.json();
  } catch (error) {
    console.error("Profile stories error:", error);

    cards.forEach(function (card) {
      card.disabled = true;
      card.classList.add("is-disabled");
    });

    return;
  }

  const profileModal = new bootstrap.Modal(modalElement);

  cards.forEach(function (card) {
    card.addEventListener("click", function () {
      const storyKey = card.getAttribute("data-profile-card");
      const story = profileStories[storyKey];

      if (!story) return;

      modalKicker.textContent = story.kicker;
      modalTitle.textContent = story.title;
      modalLead.textContent = story.lead;

      modalStory.innerHTML = `
        <div>
          <h3>${story.heading}</h3>
        </div>

        <div>
          ${story.paragraphs.map(function (paragraph) {
            return `<p>${paragraph}</p>`;
          }).join("")}
        </div>
      `;

      modalProof.innerHTML = story.proof.map(function (item) {
        return `
          <article class="modal-proof-card">
            <span>${item.label}</span>
            <p>${item.text}</p>
          </article>
        `;
      }).join("");

      profileModal.show();
    });
  });
}

/* =========================================================
   03. Image Carousel State
========================================================= */

const carouselGalleryStore = new Map();

let activeGalleryKey = null;
let activeImageIndex = 0;
let imageViewerModalInstance = null;

/* =========================================================
   04. Image Carousels
   Detects img1, img2, img3...
   Supports png, jpg, jpeg, webp
========================================================= */

function initImageCarousels() {
  const carouselCards = document.querySelectorAll("[data-image-carousel]");

  carouselCards.forEach(function (card, carouselIndex) {
    initSingleCarousel(card, carouselIndex);
  });
}

async function initSingleCarousel(card, carouselIndex) {
  const carousel = card.querySelector(".mini-carousel");
  const folder = normalizeFolderPath(card.getAttribute("data-folder"));
  const altText = card.getAttribute("data-alt") || "Carousel image";

  const maxImagesToCheck = Number(card.getAttribute("data-max")) || 40;
  const stopAfterMissing = Number(card.getAttribute("data-stop-after")) || 6;
  const extensions = getExtensionOrder(card);

  if (!carousel || !folder) return;

  const galleryKey = `carousel-${carouselIndex}`;
  const galleryImages = [];

  carouselGalleryStore.set(galleryKey, galleryImages);

  carousel.innerHTML = "";

  const track = document.createElement("div");
  track.className = "mini-carousel-track";

  const groupA = document.createElement("div");
  groupA.className = "mini-carousel-group";

  const groupB = document.createElement("div");
  groupB.className = "mini-carousel-group";
  groupB.setAttribute("aria-hidden", "true");

  track.appendChild(groupA);
  track.appendChild(groupB);
  carousel.appendChild(track);

  let missingInARow = 0;

  for (let index = 1; index <= maxImagesToCheck; index++) {
    const imageSrc = await findExistingImageSrc(folder, index, extensions);

    if (!imageSrc) {
      missingInARow++;

      if (missingInARow >= stopAfterMissing) {
        break;
      }

      continue;
    }

    missingInARow = 0;

    const image = {
      src: imageSrc,
      alt: `${altText} ${index}`
    };

    const imageIndex = galleryImages.length;

    galleryImages.push(image);

    addCarouselItem({
      group: groupA,
      image,
      galleryKey,
      imageIndex,
      isDuplicate: false
    });

    addCarouselItem({
      group: groupB,
      image,
      galleryKey,
      imageIndex,
      isDuplicate: true
    });
  }

  if (!galleryImages.length) {
    card.classList.add("is-disabled");
  }
}

function normalizeFolderPath(folder) {
  if (!folder) return "";

  return folder.endsWith("/") ? folder : `${folder}/`;
}

function getExtensionOrder(card) {
  const customExtensions = card.getAttribute("data-extensions");

  if (customExtensions) {
    return customExtensions
      .split(",")
      .map(function (extension) {
        return extension.trim().replace(".", "").toLowerCase();
      })
      .filter(Boolean);
  }

  const folder = card.getAttribute("data-folder") || "";

  if (folder.includes("brands") || folder.includes("certifications")) {
    return ["png", "jpg", "jpeg", "webp"];
  }

  return ["jpg", "jpeg", "png", "webp"];
}

function findExistingImageSrc(folder, index, extensions) {
  return new Promise(function (resolve) {
    let currentExtensionIndex = 0;

    function tryNextExtension() {
      if (currentExtensionIndex >= extensions.length) {
        resolve(null);
        return;
      }

      const extension = extensions[currentExtensionIndex];
      const imageSrc = `${folder}img${index}.${extension}`;
      const testImage = new Image();

      testImage.onload = function () {
        resolve(imageSrc);
      };

      testImage.onerror = function () {
        currentExtensionIndex++;
        tryNextExtension();
      };

      testImage.src = imageSrc;
    }

    tryNextExtension();
  });
}

function addCarouselItem({ group, image, galleryKey, imageIndex, isDuplicate }) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "mini-carousel-item";
  item.setAttribute("aria-label", `Open ${image.alt}`);
  item.setAttribute("data-gallery-key", galleryKey);
  item.setAttribute("data-gallery-index", String(imageIndex));

  if (isDuplicate) {
    item.setAttribute("tabindex", "-1");
  }

  const img = document.createElement("img");
  img.src = image.src;
  img.alt = image.alt;
  img.loading = "lazy";
  img.decoding = "async";

  item.addEventListener("click", function () {
    openImageViewer(galleryKey, imageIndex);
  });

  item.appendChild(img);
  group.appendChild(item);
}

/* =========================================================
   05. Image Viewer Modal
   Includes previous / next navigation
========================================================= */

function initImageViewerModal() {
  const modalElement = document.getElementById("imageViewerModal");

  if (!modalElement || typeof bootstrap === "undefined") return;

  imageViewerModalInstance = new bootstrap.Modal(modalElement);

  ensureImageViewerControls();
  bindImageViewerKeyboardControls();

  modalElement.addEventListener("hidden.bs.modal", function () {
    const viewerImage = document.getElementById("imageViewerImg");

    if (viewerImage) {
      viewerImage.src = "";
      viewerImage.alt = "";
    }

    activeGalleryKey = null;
    activeImageIndex = 0;
  });
}

function ensureImageViewerControls() {
  const modalElement = document.getElementById("imageViewerModal");
  const header = modalElement ? modalElement.querySelector(".image-viewer-header") : null;

  if (!header || header.querySelector(".image-viewer-controls")) return;

  const controls = document.createElement("div");
  controls.className = "image-viewer-controls";
  controls.setAttribute("aria-label", "Image navigation controls");

  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.className = "image-viewer-nav-btn";
  previousButton.setAttribute("aria-label", "Previous image");
  previousButton.innerHTML = `<i class="ph ph-caret-left"></i>`;

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "image-viewer-nav-btn";
  nextButton.setAttribute("aria-label", "Next image");
  nextButton.innerHTML = `<i class="ph ph-caret-right"></i>`;

  previousButton.addEventListener("click", showPreviousImage);
  nextButton.addEventListener("click", showNextImage);

  controls.appendChild(previousButton);
  controls.appendChild(nextButton);

  header.insertBefore(controls, header.firstChild);
}

function bindImageViewerKeyboardControls() {
  document.addEventListener("keydown", function (event) {
    if (!activeGalleryKey) return;

    if (event.key === "ArrowLeft") {
      showPreviousImage();
    }

    if (event.key === "ArrowRight") {
      showNextImage();
    }
  });
}

function openImageViewer(galleryKey, imageIndex) {
  const gallery = carouselGalleryStore.get(galleryKey);

  if (!gallery || !gallery.length || !imageViewerModalInstance) return;

  activeGalleryKey = galleryKey;
  activeImageIndex = normalizeImageIndex(imageIndex, gallery.length);

  updateImageViewerContent();
  imageViewerModalInstance.show();
}

function showPreviousImage() {
  const gallery = carouselGalleryStore.get(activeGalleryKey);

  if (!gallery || !gallery.length) return;

  activeImageIndex = normalizeImageIndex(activeImageIndex - 1, gallery.length);
  updateImageViewerContent();
}

function showNextImage() {
  const gallery = carouselGalleryStore.get(activeGalleryKey);

  if (!gallery || !gallery.length) return;

  activeImageIndex = normalizeImageIndex(activeImageIndex + 1, gallery.length);
  updateImageViewerContent();
}

function normalizeImageIndex(index, total) {
  if (index < 0) return total - 1;
  if (index >= total) return 0;

  return index;
}

function updateImageViewerContent() {
  const gallery = carouselGalleryStore.get(activeGalleryKey);
  const viewerImage = document.getElementById("imageViewerImg");
  const viewerTitle = document.getElementById("imageViewerTitle");

  if (!gallery || !gallery.length || !viewerImage) return;

  const image = gallery[activeImageIndex];

  viewerImage.src = image.src;
  viewerImage.alt = image.alt;

  if (viewerTitle) {
    viewerTitle.textContent = `${image.alt} · ${activeImageIndex + 1}/${gallery.length}`;
  }
}