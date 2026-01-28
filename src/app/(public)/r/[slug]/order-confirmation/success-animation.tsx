'use client'

/**
 * Success Animation with Checkmark
 * Client component for CSS animations
 */
export function SuccessAnimation() {
  return (
    <div className="relative mx-auto h-24 w-24">
      {/* Background Circle */}
      <div className="absolute inset-0 rounded-full bg-green-100 dark:bg-green-900/30" />

      {/* Animated Circle Border */}
      <svg
        className="absolute inset-0 h-full w-full -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-green-500 dark:text-green-400"
          strokeDasharray="289"
          strokeDashoffset="0"
          style={{
            animation: 'dash 0.8s ease-in-out forwards',
          }}
        />
      </svg>

      {/* Checkmark */}
      <svg
        className="absolute inset-0 m-auto h-12 w-12 text-green-600 dark:text-green-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{
          animation: 'checkmark 0.4s ease-in-out 0.4s forwards',
          opacity: 0,
        }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
          d="M5 13l4 4L19 7"
        />
      </svg>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes dash {
          from {
            stroke-dashoffset: 289;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes checkmark {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}

