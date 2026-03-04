<template>
  <!--
    SVG feTurbulence noise — rendered once, covers entire viewport.
    Very low opacity + overlay blend mode gives subtle film grain.
  -->
  <div class="noise-overlay" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <filter id="noiseFilter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="4"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noiseFilter)" />
    </svg>
  </div>
</template>
