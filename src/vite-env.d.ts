/// <reference types="vite/client" />

// Static asset imports — Vite handles them at build time and exposes a
// hashed URL string. We declare them here so TypeScript stops complaining
// about `import logo from './foo.svg'`.
declare module '*.svg' {
  const url: string;
  export default url;
}

declare module '*.png' {
  const url: string;
  export default url;
}

declare module '*.jpg' {
  const url: string;
  export default url;
}

declare module '*.jpeg' {
  const url: string;
  export default url;
}

declare module '*.webp' {
  const url: string;
  export default url;
}
