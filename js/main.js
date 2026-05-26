document.addEventListener("DOMContentLoaded", function () {
  initSmoothScroll();
  initProfileModal();
  initImageCarousels();
});

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

async function initImageCarousels() {
  const carouselCards = document.querySelectorAll("[data-image-carousel]");

  for (const card of carouselCards) {
    const carousel = card.querySelector(".mini-carousel");
    const folder = card.getAttribute("data-folder");
    const altText = card.getAttribute("data-alt") || "Carousel image";

    /*
      Optional controls:
      - data-max: maximum image number to check.
      - data-stop-after: how many missing images in a row before stopping.
      
      If you do not add these attributes in HTML, defaults are used.
    */
    const maxImagesToCheck = Number(card.getAttribute("data-max")) || 80;
    const stopAfterMissing = Number(card.getAttribute("data-stop-after")) || 8;

    if (!carousel || !folder) return;

    const images = await findExistingCarouselImages(
      folder,
      altText,
      maxImagesToCheck,
      stopAfterMissing
    );

    if (!images.length) {
      card.classList.add("is-disabled");
      return;
    }

    const track = document.createElement("div");
    track.className = "mini-carousel-track";

    /*
      Duplicates the image list so the CSS marquee animation feels continuous.
    */
    const duplicatedImages = images.concat(images);

    duplicatedImages.forEach(function (image) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "mini-carousel-item";
      item.setAttribute("aria-label", `Open ${image.alt}`);
      item.setAttribute("data-full-image", image.src);
      item.setAttribute("data-full-alt", image.alt);

      const img = document.createElement("img");
      img.src = image.src;
      img.alt = image.alt;
      img.loading = "lazy";

      item.addEventListener("click", function () {
        const fullImageSrc = item.getAttribute("data-full-image");
        const fullImageAlt = item.getAttribute("data-full-alt") || altText;

        if (!fullImageSrc) return;

        openImageViewer(fullImageSrc, fullImageAlt);
      });

      item.appendChild(img);
      track.appendChild(item);
    });

    carousel.appendChild(track);
  }
}

async function findExistingCarouselImages(folder, altText, maxImagesToCheck, stopAfterMissing) {
  const images = [];
  let missingInARow = 0;

  for (let index = 1; index <= maxImagesToCheck; index++) {
    const imageSrc = await findExistingImageSrc(folder, index);

    if (imageSrc) {
      images.push({
        src: imageSrc,
        alt: `${altText} ${index}`
      });

      missingInARow = 0;
    } else {
      missingInARow++;

      /*
        This prevents the browser from checking forever.
        Example: if img1 to img17 exist and img18-img25 do not,
        it stops after 8 consecutive missing files.
      */
      if (missingInARow >= stopAfterMissing) {
        break;
      }
    }
  }

  return images;
}

function findExistingImageSrc(folder, index) {
  const extensions = ["png", "jpg", "jpeg", "webp"];

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

function openImageViewer(imageSrc, imageAlt) {
  const modalElement = document.getElementById("imageViewerModal");
  const viewerImage = document.getElementById("imageViewerImg");
  const viewerTitle = document.getElementById("imageViewerTitle");

  if (!modalElement || !viewerImage || typeof bootstrap === "undefined") return;

  viewerImage.src = imageSrc;
  viewerImage.alt = imageAlt;

  if (viewerTitle) {
    viewerTitle.textContent = imageAlt;
  }

  const imageViewerModal = new bootstrap.Modal(modalElement);
  imageViewerModal.show();

  modalElement.addEventListener("hidden.bs.modal", function () {
    viewerImage.src = "";
    viewerImage.alt = "";
  }, { once: true });
}