/** SVG displacement filters for Liquid Glass tab bar surfaces. */
export function LiquidGlassDefs() {
  return (
    <svg className="liquid-glass-defs" aria-hidden width="0" height="0">
      <defs>
        <filter
          id="sibs-liquid-glass-refract"
          x="-12%"
          y="-24%"
          width="124%"
          height="148%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75 0.65"
            numOctaves="3"
            seed="8"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="0.35" result="softNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softNoise"
            scale="7"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
