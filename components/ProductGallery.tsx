"use client";

import { useState } from "react";
import StoreImage from "./StoreImage";

interface ProductGalleryProps {
  name: string;
  images: string[];
}

export default function ProductGallery({ name, images }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex];

  return (
    <div className="product-detail-gallery">
      <div className="product-detail-image-wrap">
        {selectedImage ? (
          <StoreImage
            className="product-detail-image"
            src={selectedImage}
            alt={name}
            loading="eager"
            sizes="(max-width: 800px) 100vw, 55vw"
          />
        ) : (
          <div
            className="product-detail-image product-image-placeholder"
            aria-label="Product image unavailable"
          >
            ✦
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="product-gallery-thumbnails" aria-label="Product images">
          {images.map((image, index) => (
            <button
              type="button"
              className={
                selectedIndex === index
                  ? "product-gallery-thumbnail selected"
                  : "product-gallery-thumbnail"
              }
              key={image}
              onClick={() => setSelectedIndex(index)}
              aria-label={`Show image ${index + 1} of ${images.length} for ${name}`}
              aria-pressed={selectedIndex === index}
            >
              <StoreImage
                src={image}
                alt=""
                loading="lazy"
                sizes="76px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
