import Image from "next/image";

interface StoreImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  loading?: "eager" | "lazy";
}

export default function StoreImage({
  src,
  alt,
  className,
  sizes = "(max-width: 700px) 100vw, 50vw",
  loading = "lazy",
}: StoreImageProps) {
  let optimizedSource = false;
  try {
    optimizedSource = new URL(src).hostname === "images.unsplash.com";
  } catch {
    optimizedSource = false;
  }

  if (optimizedSource) {
    return (
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={1200}
        sizes={sizes}
        quality={85}
        loading={loading}
        className={className}
      />
    );
  }

  return <img src={src} alt={alt} loading={loading} className={className} />;
}
