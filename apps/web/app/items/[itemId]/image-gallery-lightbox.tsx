"use client";

import { useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import { deleteItemImage } from "@/app/actions";
import styles from "@/app/items/[itemId]/item-details.module.css";
import type { ItemReadResource } from "@/app/services/item-service";

type Props = {
  itemId: string;
  itemName: string;
  images: ItemReadResource["images"];
};

export default function ItemImageGalleryLightbox({ itemId, itemName, images }: Props) {
  const [index, setIndex] = useState(-1);

  if (images.length === 0) {
    return (
      <section className={styles.card}>
        <div>No Images</div>
      </section>
    );
  }

  const slides = useMemo(
    () =>
      images.map((image) => ({
        src: image.public_url,
        alt: image.caption ?? itemName,
        description: image.caption ?? undefined
      })),
    [images, itemName]
  );

  return (
    <section className={styles.card}>
      <div className={styles.galleryHeader}>
        <p className={styles.galleryCount}>
          {images.length} image{images.length > 1 ? "s" : ""}
        </p>
        <button type="button" className={styles.btnSecondary} onClick={() => setIndex(0)} style={{ padding: "0 0.5rem" }}>
          View all
        </button>
      </div>

      <div className={styles.gallery}>
        {images.map((img, imgIndex) => (
          <div key={img.id} className={styles.galleryItem}>
            <button
              type="button"
              className={styles.galleryImageButton}
              onClick={() => setIndex(imgIndex)}
              aria-label={`Open image ${imgIndex + 1} of ${images.length}`}
            >
              <img src={img.public_url} alt={img.caption ?? itemName} className={styles.galleryImg} />
            </button>
            <form action={deleteItemImage} className={styles.galleryDeleteForm}>
              <input type="hidden" name="itemId" value={itemId} />
              <input type="hidden" name="imageId" value={img.id} />
              <button type="submit" className={`${styles.iconBtn} ${styles.galleryDeleteBtn}`} aria-label="Delete image">
                ×
              </button>
            </form>
          </div>
        ))}
      </div>

      <Lightbox
        open={index >= 0}
        close={() => setIndex(-1)}
        index={index}
        slides={slides}
        plugins={[Zoom, Fullscreen, Thumbnails]}
        carousel={{ finite: images.length < 2 }}
      />
    </section>
  );
}
