"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ImageGalleryModal } from "./image-gallery-modal";

export interface ImageItem {
  src: string;
  alt?: string;
  details?: string;
}

export interface ImageGalleryProps {
  images: ImageItem[];
  className?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
};

// Get grid layout class based on image count
function getLayoutClassName(imageCount: number): string {
  switch (imageCount) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-2 grid-rows-2";
    case 4:
      return "grid-cols-2 grid-rows-2";
    default:
      return "grid-cols-3";
  }
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  className,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null,
  );

  const layoutClassName = useMemo(
    () => getLayoutClassName(images.length),
    [images.length],
  );

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  return (
    <>
      <motion.div
        className={cn("w-full", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className={cn("grid gap-2", layoutClassName)}>
          {images.map((image, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={cn(
                "relative overflow-hidden rounded-lg cursor-pointer",
                "border border-border bg-card",
                "hover:border-foreground/20 transition-colors duration-200",
                // Special positioning for 3-image layout
                images.length === 3 && index === 0 && "row-span-2",
              )}
              onClick={() => handleImageClick(index)}
            >
              <img
                src={image.src}
                alt={image.alt || `Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {selectedImageIndex !== null && (
        <ImageGalleryModal
          images={images}
          selectedIndex={selectedImageIndex}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

ImageGallery.displayName = "ImageGallery";
