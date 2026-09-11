export function CarouselArrows({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-surface to-transparent sm:w-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-surface to-transparent sm:w-20" />
      <button
        onClick={onPrev}
        aria-label="Scroll left"
        className="btn-circle absolute left-0 top-1/2 z-20 h-10 w-10 -translate-y-1/2 bg-surface text-base sm:left-1 sm:h-11 sm:w-11 sm:text-lg"
      >
        ←
      </button>
      <button
        onClick={onNext}
        aria-label="Scroll right"
        className="btn-circle absolute right-0 top-1/2 z-20 h-10 w-10 -translate-y-1/2 bg-surface text-base sm:right-1 sm:h-11 sm:w-11 sm:text-lg"
      >
        →
      </button>
    </>
  );
}
