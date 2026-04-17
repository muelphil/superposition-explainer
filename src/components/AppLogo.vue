<template>
  <!-- viewBox: 0 0 177 45  (SUPER top-left, POSITION overlapping bottom-right, EXPLAINER baseline y≈44) -->
  <svg
    class="app-logo"
    viewBox="0 0 177 45"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="SuperPosition Explainer"
    role="img"
  >
    <!-- ── SUPER ─────────────────────────────────────────────── -->
    <g id="logo-super">
      <path fill-rule="nonzero" d="M2.513,-0l8.085,0l1.739,2.64l-1.958,1.912l-1.247,-1.839l-5.49,0l-0.601,0.638l0,3.305l0.911,1.329l6.892,0l2.103,3.168l0,5.754l-2.13,2.212l-9.341,0l-1.475,-2.094l1.894,-1.976l0.993,1.357l6.71,0l0.419,-0.355l0,-4.452l-0.638,-0.901l-6.901,0l-2.367,-3.524l0,-4.671l2.404,-2.504Z"/>
      <path fill-rule="nonzero" d="M26.349,-0l0,15.742l-0.656,0.665l-5.445,0l-0.883,-1.329l0,-15.077l-2.932,0l0,15.587l2.394,3.532l5.791,0l1.73,-1.065l0,1.065l2.941,0l0,-19.12l-2.941,-0Z"/>
      <path fill-rule="nonzero" d="M32.831,-0l0,19.12l2.932,0l0,-8.458l7.521,0l2.385,-2.431l0,-4.698l-2.349,-3.532l-10.489,0Zm2.941,2.713l6.082,0l0.883,1.338l0,3.305l-0.628,0.638l-4.58,0l-1.757,1.029l0,-6.31Z"/>
      <path fill-rule="nonzero" d="M59.864,16.407l-7.02,0l-0.883,-1.329l0,-4.434l6.319,0l0,-2.722l-6.319,0l0,-4.543l0.61,-0.665l9.287,0l0,-2.713l-10.398,0l-2.431,2.486l0,13.102l2.367,3.532l8.468,0l0,-2.713Z"/>
      <path fill-rule="nonzero" d="M65.599,-0l0,19.12l2.932,0l0,-9.469l1.685,1.047l2.722,0l2.577,3.76l0,4.662l2.941,0l0,-5.126l-2.576,-3.76l2.576,-2.649l0,-3.041l-3.114,-4.543l-9.742,0Zm2.932,2.713l5.345,0l1.639,2.367l0,1.702l-1.175,1.193l-5.809,0l0,-5.263Z"/>
    </g>

    <!-- ── POSITION ──────────────────────────────────────────── -->
    <g id="logo-position">
      <rect x="51.996" y="19.819" width="3.103" height="8.384"/>
      <path d="M78.404,19.819l0,5.88l-2.376,2.504l-8.049,0l-2.395,-3.532l0,-4.852l2.932,0l0,4.36l0.883,1.311l5.444,0l0.619,-0.665l0,-5.006l2.941,0Z"/>
      <path fill-rule="nonzero" d="M83.946,9.083l8.085,0l1.739,2.64l-1.958,1.912l-1.247,-1.839l-5.49,0l-0.601,0.638l0,3.305l0.911,1.329l6.892,0l2.103,3.168l0,5.754l-2.13,2.212l-9.341,0l-1.475,-2.094l1.894,-1.976l0.993,1.357l6.71,0l0.419,-0.355l0,-4.452l-0.638,-0.901l-6.901,0l-2.367,-3.524l0,-4.671l2.404,-2.504Z"/>
      <path fill-rule="nonzero" d="M97.876,9.083l0,2.722l4.944,0l0,13.675l-4.944,0l0,2.722l12.838,0l0,-2.722l-4.962,0l0,-13.675l4.962,0l0,-2.722l-12.838,0Z"/>
      <path fill-rule="nonzero" d="M113.554,9.083l14.258,0l0,2.713l-7.557,0l1.912,1.512l0,14.895l-2.941,0l0,-14.294l-0.874,-2.113l-4.798,0l0,-2.713Z"/>
      <path fill-rule="nonzero" d="M130.653,9.083l0,2.722l4.944,0l0,13.675l-4.944,0l0,2.722l12.838,0l0,-2.722l-4.962,0l0,-13.675l4.962,0l0,-2.722l-12.838,0Z"/>
      <path fill-rule="nonzero" d="M149.481,9.083l8.067,0l2.322,3.532l0,13.083l-2.376,2.504l-8.049,0l-2.395,-3.532l0,-13.083l2.431,-2.504Zm0.501,15.096l0.883,1.311l5.444,0l0.619,-0.665l0,-11.718l-0.874,-1.311l-5.463,0l-0.61,0.665l0,11.718Z"/>
      <path fill-rule="nonzero" d="M173.336,9.083l0,7.748l-5.017,-7.748l-4.871,0l0,19.12l2.932,0l0,-16.042l0.501,0l6.455,9.605l0,6.437l2.941,0l0,-19.12l-2.941,0Z"/>
      <path d="M59.144,10.807l1.526,0l0.941,1.428l0,3.525l-0.669,0.68l-0.263,0l0,2.845l1.514,0l2.542,-2.593l0,-5.011l-2.503,-3.768l-3.088,0l0,2.894Z"/>
    </g>

    <!-- ── EXPLAINER (secondary mono font) ───────────────────── -->
    <text
      class="logo-explainer"
      x="50.4"
      y="44"
      textLength="76"
      lengthAdjust="spacing"
    >EXPLAINER</text>
  </svg>
</template>

<style scoped>
.app-logo {
  height: 2.4rem;
  width: auto;
  display: block;
  overflow: visible;
}

/* Both words use the primary text color */
#logo-super,
#logo-position {
  fill: var(--color-text-secondary);
}

/* Antiphase opacity pulse */
#logo-super {
  animation: logo-pulse 2.8s ease-in-out infinite;
}
#logo-position {
  animation: logo-pulse 2.8s ease-in-out infinite;
  animation-delay: -1.4s; /* 180° out of phase */
}

@keyframes logo-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1.0; }
}

/* EXPLAINER: secondary (mono) font, secondary text color */
.logo-explainer {
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 14px;
  fill: var(--color-text-secondary);
  letter-spacing: 0;
}
</style>
