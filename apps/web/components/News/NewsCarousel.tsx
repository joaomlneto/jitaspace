"use client";

import { Carousel } from "@mantine/carousel";
import { Box } from "@mantine/core";

import type { UseDismissedNewsOptions } from "./useDismissedNews";
import { NEWS_BANNER_HEIGHT, NewsBannerCard } from "./NewsBannerCard";
import classes from "./NewsCarousel.module.css";
import { useDismissedNews } from "./useDismissedNews";

export type NewsCarouselProps = UseDismissedNewsOptions;

/** Flashy, image-forward banner cards in a horizontally-scrollable carousel. */
export function NewsCarousel(props: Readonly<NewsCarouselProps>) {
  const { activeItems, mounted, dismiss } = useDismissedNews(props);

  // Before mount we can't read dismissals (localStorage) or expiry (wall clock),
  // so the active items aren't known yet. Reserve the banner's height instead of
  // rendering nothing, so the carousel popping in after hydration doesn't push
  // the rest of the home page down (a layout shift / CLS).
  if (!mounted) return <Box aria-hidden h={NEWS_BANNER_HEIGHT} mb="xl" />;

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
