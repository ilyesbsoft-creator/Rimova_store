
export default function ProductLoading() {
  return (
    <main
      dir="rtl"
      role="status"
      aria-label="جارٍ تحميل المنتج"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf9f6] px-6 text-[#252720]"
    >
      {/* Background decoration */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-20 h-80 w-80 rounded-full bg-[#e8e4d8]/60 blur-3xl rimova-glow-one"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-[#e9e6dd]/70 blur-3xl rimova-glow-two"
      />

      {/* Loading composition */}

      <div className="relative flex w-full max-w-sm flex-col items-center">

        {/* Brand */}

        <a
          href="/"
          aria-label="RIMOVA - الصفحة الرئيسية"
          className="text-3xl font-black tracking-[0.16em] sm:text-4xl rimova-fade-up"
        >
          RIMOVA
        </a>

        <div className="mt-4 h-px w-14 origin-center bg-[#85816d] rimova-line" />

        {/* Animated emblem */}

        <div className="relative mt-14 flex h-40 w-40 items-center justify-center">

          {/* Outer orbit */}

          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-[#b5b09f]/60 rimova-orbit"
          >
            <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#85816d]" />
          </div>

          {/* Middle orbit */}

          <div
            aria-hidden="true"
            className="absolute inset-3 rounded-full border border-dashed border-[#b5b09f]/60 rimova-orbit-reverse"
          />

          {/* Inner ring */}

          <div
            aria-hidden="true"
            className="absolute inset-7 rounded-full border border-[#b5b09f]/70 rimova-pulse"
          />

          {/* Brand emblem */}

          <div
            aria-hidden="true"
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#e9e6dd] text-4xl text-[#77735f] shadow-[0_8px_35px_rgba(37,39,32,0.07)] rimova-float"
          >
            <span className="rimova-symbol">✳</span>
          </div>
        </div>

        {/* Loading message */}

        <div className="mt-9 text-center rimova-message">

          <h1 className="text-lg font-bold tracking-wide">
            لحظات من أجلك
          </h1>

          <p className="mt-3 text-sm leading-7 text-[#77735f]">
            نجهّز لك تجربة RIMOVA
          </p>

        </div>

        {/* Infinite loading indicator */}

        <div
          aria-hidden="true"
          className="relative mt-9 h-[3px] w-44 overflow-hidden rounded-full bg-[#e9e6dd]"
        >
          <div className="absolute inset-y-0 right-0 w-1/3 rounded-full bg-[#85816d] rimova-progress" />
        </div>

        {/* Decorative dots */}

        <div
          aria-hidden="true"
          className="mt-7 flex items-center gap-2"
        >
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-1.5 w-1.5 rounded-full bg-[#85816d] rimova-dot"
            />
          ))}
        </div>

        {/* Footer signature */}

        <p className="mt-12 text-[10px] font-semibold tracking-[0.3em] text-[#a29d8b] rimova-footer">
          SIMPLICITY MAKES THE DIFFERENCE
        </p>

      </div>
    </main>
  );
}
