"use client";

import { Steps, StepsItem } from "@/components/ui/steps";
import { ImageGallery } from "@/components/ui/image-gallery";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TestComponentsPage() {
  return (
    <div className="container mx-auto py-8 space-y-12 max-w-5xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">UI Components Test Page</h1>
        <p className="text-muted-foreground">
          Testing Steps, ImageGallery, and Carousel components
        </p>
      </div>

      {/* Steps Component */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Steps Component</h2>
        <Card>
          <CardHeader>
            <CardTitle>Recipe: Chocolate Chip Cookies</CardTitle>
            <CardDescription>
              Follow these steps to bake cookies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Steps>
              <StepsItem
                title="Preheat Oven"
                details="Set oven to 350°F (175°C)"
              />
              <StepsItem
                title="Mix Dry Ingredients"
                details="Combine flour, baking soda, and salt in a bowl"
              />
              <StepsItem
                title="Cream Butter and Sugar"
                details="Beat butter, sugar, and brown sugar until fluffy"
              />
              <StepsItem
                title="Add Wet Ingredients"
                details="Mix in eggs and vanilla extract"
              />
              <StepsItem
                title="Combine & Add Chips"
                details="Gradually blend in dry mixture, then fold in chocolate chips"
              />
              <StepsItem
                title="Bake"
                details="Drop spoonfuls onto sheet and bake for 9-11 minutes"
              />
            </Steps>
          </CardContent>
        </Card>
      </section>

      {/* ImageGallery Component */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">ImageGallery Component</h2>

        <Card>
          <CardHeader>
            <CardTitle>Single Image</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageGallery
              images={[
                {
                  src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
                  alt: "Mountain landscape",
                  details: "Beautiful mountain vista",
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Two Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageGallery
              images={[
                {
                  src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
                  alt: "Mountains",
                },
                {
                  src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
                  alt: "Forest",
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Three Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageGallery
              images={[
                {
                  src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
                  alt: "Mountains",
                },
                {
                  src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
                  alt: "Forest",
                },
                {
                  src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
                  alt: "River",
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Six Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageGallery
              images={[
                {
                  src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
                  alt: "Mountains",
                },
                {
                  src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
                  alt: "Forest",
                },
                {
                  src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
                  alt: "River",
                },
                {
                  src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
                  alt: "Lake",
                },
                {
                  src: "https://images.unsplash.com/photo-1426604966848-d7adac402bff",
                  alt: "Valley",
                },
                {
                  src: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29",
                  alt: "Sunset",
                },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nine Images</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageGallery
              images={[
                {
                  src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4",
                  alt: "Mountains",
                },
                {
                  src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
                  alt: "Forest",
                },
                {
                  src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e",
                  alt: "River",
                },
                {
                  src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
                  alt: "Lake",
                },
                {
                  src: "https://images.unsplash.com/photo-1426604966848-d7adac402bff",
                  alt: "Valley",
                },
                {
                  src: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29",
                  alt: "Sunset",
                },
                {
                  src: "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5",
                  alt: "Desert",
                },
                {
                  src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
                  alt: "Snowy Mountain",
                },
                {
                  src: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5",
                  alt: "Waterfall",
                },
              ]}
            />
          </CardContent>
        </Card>
      </section>

      {/* Carousel Component */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Carousel Component</h2>
        <Card>
          <CardHeader>
            <CardTitle>Featured Products</CardTitle>
            <CardDescription>Scroll through our top items</CardDescription>
          </CardHeader>
          <CardContent>
            <Carousel itemsToScroll={1}>
              <CarouselContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <CarouselItem
                    key={num}
                    className="basis-full md:basis-1/2 lg:basis-1/3"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Product {num}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                          <span className="text-4xl font-bold text-muted-foreground">
                            {num}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Description for product {num}
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
