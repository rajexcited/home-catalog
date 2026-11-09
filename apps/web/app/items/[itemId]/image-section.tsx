import { uploadItemImage } from "@/app/actions";
import { CameraIcon } from "@/components/icons";
import styles from "@/app/items/[itemId]/item-details.module.css";
import { ItemReadResource } from "@/app/services/item-service";
import ItemImageGalleryLightbox from "./image-gallery-lightbox";

type Props = { item: ItemReadResource };

export default async function ItemImageSectionPage({ item }: Props) {
  return (
    <>
      <ItemImageGalleryLightbox itemId={item.id} itemName={item.name} images={item.images} />
      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Upload Photo</h2>
        <form action={uploadItemImage} className={styles.form}>
          <input type="hidden" name="itemId" value={item.id} />
          <input type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif" className={styles.input} required />
          <input name="caption" placeholder="Caption (optional)" className={styles.input} />
          <button type="submit" className={styles.btnSecondary + " " + styles.uploadImgBtn}>
            <CameraIcon size={16} />
            Upload Image
          </button>
        </form>
      </section>
    </>
  );
}
