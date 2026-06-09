"use client";

import { Carousel } from "@mantine/carousel";

import { NewsBannerCard } from "./NewsBannerCard";
import classes from "./NewsCarousel.module.css";
import {
  useDismissedNews,
  type UseDismissedNewsOptions,
} from "./useDismissedNews";

export type NewsCarouselProps = UseDismissedNewsOptions;

/** Flashy, image-forward banner cards in a horizontally-scrollable carousel. */
export function NewsCarousel(props: Readonly<NewsCarouselProps>) {
  const { activeItems, dismiss } = useDismissedNews(props);

  if (activeItems.length === 0) return null;

  const multiple = activeItems.length > 1;

  return (
    <Carousel
      withControls={multiple}
      withIndicators={multiple}
      slideSize={{ base: "100%", sm: "50%" }}
      slideGap="md"
      controlSize={32}
      controlsOffset={12}
      px={{ base: 0, sm: "3.5rem" }}
      emblaOptions={{ align: "start", containScroll: "trimSnaps" }}
      classNames={{ controls: classes.controls }}
      styles={{ indicators: { bottom: "-1.75rem" } }}
      mb={multiple ? 48 : "xl"}
    >
      {activeItems.map((item) => (
        <Carousel.Slide key={item.id}>
          <NewsBannerCard item={item} onDismiss={() => dismiss(item.id)} />
        </Carousel.Slide>
      ))}
    </Carousel>
  );
}
