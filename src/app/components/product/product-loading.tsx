
"use client";

import { motion, MotionConfig } from "motion/react";

export default function ProductLoading() {
  return (
    <MotionConfig reducedMotion="user">
      <main
        dir="rtl"
        role="status"
        aria-label="جارٍ تحميل المنتج"
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf9f6] px-6 text-[#252720]"
      >
        {/* Background decoration */}

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-20 h-80 w-80 rounded-full bg-[#e8e4d8]/60 blur-3xl"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.35, 0.65, 0.35],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-[#e9e6dd]/70 blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.3, 0.55, 0.3],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Loading composition */}

        <div className="relative flex w-full max-w-sm flex-col items-center">
          {/* Brand */}

          <motion.a
            href="/"
            aria-label="RIMOVA - الصفحة الرئيسية"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-3xl font-black tracking-[0.16em] sm:text-4xl"
          >
            RIMOVA
          </motion.a>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-4 h-px w-14 origin-center bg-[#85816d]"
          />

          {/* Animated emblem */}

          <div className="relative mt-14 flex h-40 w-40 items-center justify-center">
            {/* Outer orbit */}

            <motion.div
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-[#b5b09f]/60"
              animate={{ rotate: 360 }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#85816d]" />
            </motion.div>

            {/* Middle orbit */}

            <motion.div
              aria-hidden="true"
              className="absolute inset-3 rounded-full border border-dashed border-[#b5b09f]/60"
              animate={{ rotate: -360 }}
              transition={{
                duration: 26,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            {/* Inner ring */}

            <motion.div
              aria-hidden="true"
              className="absolute inset-7 rounded-full border border-[#b5b09f]/70"
              animate={{
                scale: [1, 1.06, 1],
                opacity: [0.55, 1, 0.55],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Brand emblem */}

            <motion.div
              aria-hidden="true"
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#e9e6dd] text-4xl text-[#77735f] shadow-[0_8px_35px_rgba(37,39,32,0.07)]"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <motion.span
                animate={{ rotate: 180 }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
              >
                ✳
              </motion.span>
            </motion.div>
          </div>

          {/* Loading message */}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-9 text-center"
          >
            <h1 className="text-lg font-bold tracking-wide">
              لحظات من أجلك
            </h1>

            <p className="mt-3 text-sm leading-7 text-[#77735f]">
              نجهّز لك تجربة RIMOVA
            </p>
          </motion.div>

          {/* Infinite loading indicator */}

          <div
            aria-hidden="true"
            className="relative mt-9 h-[3px] w-44 overflow-hidden rounded-full bg-[#e9e6dd]"
          >
            <motion.div
              className="absolute inset-y-0 right-0 w-1/3 rounded-full bg-[#85816d]"
              animate={{
                x: ["0%", "-430%"],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Decorative dots */}

          <motion.div
            aria-hidden="true"
            className="mt-7 flex items-center gap-2"
          >
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="h-1.5 w-1.5 rounded-full bg-[#85816d]"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.85, 1.2, 0.85],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: dot * 0.22,
                }}
              />
            ))}
          </motion.div>

          {/* Footer signature */}

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="mt-12 text-[10px] font-semibold tracking-[0.3em] text-[#a29d8b]"
          >
            SIMPLICITY MAKES THE DIFFERENCE
          </motion.p>
        </div>
      </main>
    </MotionConfig>
  );
}
