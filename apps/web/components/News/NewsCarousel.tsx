"use client";

import { Carousel } from "@mantine/carousel";
import { Box } from "@mantine/core";

import type { UseDismissedNewsOptions } from "./useDismissedNews";
import type { NewsItem } from "~/config/news";
import { NEWS_BANNER_HEIGHT, NewsBannerCard } from "./NewsBannerCard";
import classes from "./NewsCarousel.module.css";
import { useDismissedNews } from "./useDismissedNews";

export interface NewsCarouselProps extends UseDismissedNewsOptions {
  /**
   * Extra cards to show after the curated ones — for generated content that
   * isn't in `~/config/news`, such as the latest patch notes.
   *
   * Their dismissal is the caller's business (it may not be id-based at all),
   * so they are passed in already-filtered and their close button calls
   * {@link onDismissExtra} rather than this carousel's own id-based `dismiss`.
   */
  extraItems?: NewsItem[];
  /** Called when an {@link extraItems} card's close button is clicked. */
  onDismissExtra?: (id: string) => void;
}

/**
 * Space below the carousel, held constant rather than sized to the number of
 * cards.
 *
 * It has to clear the indicators, which sit outside the carousel at
 * `bottom: -1.75rem` and only appear when there is more than one card. Sizing it
 * to that would make the page's layout depend on how many cards a given visitor
 * has dismissed — which isn't knowable until after mount, so every dismissal
 * would be a layout shift. Reserving the taller value always costs a single card
 * some extra breathing room and buys a stable page.
 */
const CAROUSEL_MARGIN_BOTTOM = 48;

/**
 * Height reserved for the carousel before it can render.
 *
 * The cards' visibility depends on localStorage and the wall clock, neither of
 * which is readable during render, so the space is held open rather than left
 * to pop in — otherwise the carousel appearing pushes the whole home page down
 * (a layout shift / CLS). Doubles as the Suspense fallback for a server-fetched
 * carousel, which has the same problem for the same reason — and must therefore
 * reserve the carousel's exact box, margin included.
 */
export function NewsCarouselPlaceholder() {
  return <Box aria-hidden h={NEWS_BANNER_HEIGHT} mb={CAROUSEL_MARGIN_BOTTOM} />;
}

/** Flashy, image-forward banner cards in a horizontally-scrollable carousel. */
export function NewsCarousel({
  extraItems,
  onDismissExtra,
  ...options
}: Readonly<NewsCarouselProps>) {
  const { activeItems, mounted, dismiss } = useDismissedNews(options);

  if (!mounted) return <NewsCarouselPlaceholder />;

  // Curated announcements lead; generated cards follow.
  const slides: { item: NewsItem; onDismiss: () => void }[] = [
    ...activeItems.map((item) => ({
      item,
      onDismiss: () => dismiss(item.id),
    })),
    ...(extraItems ?? []).map((item) => ({
      item,
      onDismiss: () => onDismissExtra?.(item.id),
    })),
  ];

  if (slides.length === 0) return null;

  const multiple = slides.length > 1;

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
      mb={CAROUSEL_MARGIN_BOTTOM}
    >
      {slides.map(({ item, onDismiss }) => (
        <Carousel.Slide key={item.id}>
          <NewsBannerCard item={item} onDismiss={onDismiss} />
        </Carousel.Slide>
      ))}
    </Carousel>
  );
}
