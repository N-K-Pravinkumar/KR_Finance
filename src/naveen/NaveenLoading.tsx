import React from 'react'

/**
 * Loading state for Naveen pages — a soft vegetable-themed background (tomato/carrot/leafy greens)
 * instead of a bare "Loading..." line, so this section feels visually distinct while data loads.
 */
export function NaveenLoading({ label = 'Loading...' }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-20 rounded-2xl overflow-hidden relative"
      style={{
        backgroundImage:
          'radial-gradient(circle at 15% 20%, rgba(220,38,38,0.10) 0, transparent 45%),' +
          'radial-gradient(circle at 85% 15%, rgba(234,88,12,0.10) 0, transparent 45%),' +
          'radial-gradient(circle at 20% 85%, rgba(21,128,61,0.12) 0, transparent 45%),' +
          'radial-gradient(circle at 80% 80%, rgba(21,128,61,0.10) 0, transparent 45%)'
      }}
    >
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-6 opacity-[0.08] text-6xl select-none pointer-events-none leading-none">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i}>{['🍅', '🥕', '🥬', '🥦', '🌶️', '🧅'][i % 6]}</span>
        ))}
      </div>
      <div className="relative w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
      <p className="relative text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}
