// Complete CSS styles for the application
// This includes Tailwind-like utilities and component styles

export const globalStyles = `
  /* Reset and Base Styles */
  *, ::before, ::after {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
    border-color: hsl(var(--border));
  }

  html {
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    -moz-tab-size: 4;
    tab-size: 4;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }

  body {
    margin: 0;
    line-height: inherit;
  }

  /* CSS Variables for theming */
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    font-size: inherit;
    font-weight: inherit;
    margin: 0;
  }

  a {
    color: inherit;
    text-decoration: inherit;
  }

  b, strong {
    font-weight: bolder;
  }

  code, kbd, samp, pre {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 1em;
  }

  button, input, optgroup, select, textarea {
    font-family: inherit;
    font-size: 100%;
    font-weight: inherit;
    line-height: inherit;
    color: inherit;
    margin: 0;
    padding: 0;
  }

  button, select {
    text-transform: none;
  }

  button, [type='button'], [type='reset'], [type='submit'] {
    -webkit-appearance: button;
    background-color: transparent;
    background-image: none;
  }

  /* Component Styles */
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Layout utilities */
  .container {
    width: 100%;
    margin-right: auto;
    margin-left: auto;
    padding-right: 1rem;
    padding-left: 1rem;
  }

  @media (min-width: 640px) {
    .container {
      max-width: 640px;
    }
  }

  @media (min-width: 768px) {
    .container {
      max-width: 768px;
    }
  }

  @media (min-width: 1024px) {
    .container {
      max-width: 1024px;
    }
  }

  @media (min-width: 1280px) {
    .container {
      max-width: 1280px;
    }
  }

  /* Flexbox utilities */
  .flex { display: flex; }
  .inline-flex { display: inline-flex; }
  .flex-col { flex-direction: column; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .items-baseline { align-items: baseline; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .justify-end { justify-content: flex-end; }
  .gap-1 { gap: 0.25rem; }
  .gap-2 { gap: 0.5rem; }
  .gap-3 { gap: 0.75rem; }
  .gap-4 { gap: 1rem; }
  .gap-6 { gap: 1.5rem; }
  .gap-8 { gap: 2rem; }
  .space-y-1 > * + * { margin-top: 0.25rem; }
  .space-y-2 > * + * { margin-top: 0.5rem; }
  .space-y-3 > * + * { margin-top: 0.75rem; }
  .space-y-4 > * + * { margin-top: 1rem; }
  .space-y-6 > * + * { margin-top: 1.5rem; }

  /* Grid utilities */
  .grid { display: grid; }
  .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  
  @media (min-width: 768px) {
    .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  /* Spacing utilities */
  .m-0 { margin: 0; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .my-auto { margin-top: auto; margin-bottom: auto; }
  .mt-1 { margin-top: 0.25rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-3 { margin-top: 0.75rem; }
  .mt-4 { margin-top: 1rem; }
  .mt-6 { margin-top: 1.5rem; }
  .mt-8 { margin-top: 2rem; }
  .mt-12 { margin-top: 3rem; }
  .mt-16 { margin-top: 4rem; }
  .mb-1 { margin-bottom: 0.25rem; }
  .mb-2 { margin-bottom: 0.5rem; }
  .mb-3 { margin-bottom: 0.75rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .mb-8 { margin-bottom: 2rem; }
  .mb-12 { margin-bottom: 3rem; }
  .mb-16 { margin-bottom: 4rem; }
  .ml-2 { margin-left: 0.5rem; }
  .ml-4 { margin-left: 1rem; }
  .ml-6 { margin-left: 1.5rem; }
  .mr-2 { margin-right: 0.5rem; }

  .p-0 { padding: 0; }
  .p-1 { padding: 0.25rem; }
  .p-2 { padding: 0.5rem; }
  .p-3 { padding: 0.75rem; }
  .p-4 { padding: 1rem; }
  .p-6 { padding: 1.5rem; }
  .p-8 { padding: 2rem; }
  .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
  .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
  .px-4 { padding-left: 1rem; padding-right: 1rem; }
  .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
  .px-8 { padding-left: 2rem; padding-right: 2rem; }
  .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
  .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
  .py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
  .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
  .py-16 { padding-top: 4rem; padding-bottom: 4rem; }
  .pt-0 { padding-top: 0; }
  .pt-2 { padding-top: 0.5rem; }
  .pl-4 { padding-left: 1rem; }
  .pl-7 { padding-left: 1.75rem; }

  /* Width/Height utilities */
  .w-full { width: 100%; }
  .w-4 { width: 1rem; }
  .w-6 { width: 1.5rem; }
  .w-8 { width: 2rem; }
  .w-9 { width: 2.25rem; }
  .w-12 { width: 3rem; }
  .h-4 { height: 1rem; }
  .h-6 { height: 1.5rem; }
  .h-8 { height: 2rem; }
  .h-9 { height: 2.25rem; }
  .h-10 { height: 2.5rem; }
  .h-12 { height: 3rem; }
  .min-h-screen { min-height: 100vh; }
  .max-w-md { max-width: 28rem; }
  .max-w-lg { max-width: 32rem; }
  .max-w-xl { max-width: 36rem; }
  .max-w-2xl { max-width: 42rem; }
  .max-w-4xl { max-width: 56rem; }
  .min-w-\\[120px\\] { min-width: 120px; }

  /* Text utilities */
  .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .text-base { font-size: 1rem; line-height: 1.5rem; }
  .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
  .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
  .text-5xl { font-size: 3rem; line-height: 1; }
  .font-normal { font-weight: 400; }
  .font-medium { font-weight: 500; }
  .font-semibold { font-weight: 600; }
  .font-bold { font-weight: 700; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .leading-none { line-height: 1; }
  .tracking-tight { letter-spacing: -0.025em; }

  /* Color utilities */
  .text-primary { color: hsl(var(--primary)); }
  .text-primary-foreground { color: hsl(var(--primary-foreground)); }
  .text-secondary-foreground { color: hsl(var(--secondary-foreground)); }
  .text-muted-foreground { color: hsl(var(--muted-foreground)); }
  .text-destructive { color: hsl(var(--destructive)); }
  .text-destructive-foreground { color: hsl(var(--destructive-foreground)); }
  .text-card-foreground { color: hsl(var(--card-foreground)); }
  .text-accent-foreground { color: hsl(var(--accent-foreground)); }

  .bg-background { background-color: hsl(var(--background)); }
  .bg-primary { background-color: hsl(var(--primary)); }
  .bg-primary\\/10 { background-color: hsl(var(--primary) / 0.1); }
  .bg-secondary { background-color: hsl(var(--secondary)); }
  .bg-muted { background-color: hsl(var(--muted)); }
  .bg-accent { background-color: hsl(var(--accent)); }
  .bg-destructive { background-color: hsl(var(--destructive)); }
  .bg-destructive\\/10 { background-color: hsl(var(--destructive) / 0.1); }
  .bg-card { background-color: hsl(var(--card)); }
  .bg-transparent { background-color: transparent; }

  /* Border utilities */
  .border { border-width: 1px; }
  .border-2 { border-width: 2px; }
  .border-t { border-top-width: 1px; }
  .border-b { border-bottom-width: 1px; }
  .border-0 { border-width: 0; }
  .border-solid { border-style: solid; }
  .border-input { border-color: hsl(var(--input)); }
  .border-border { border-color: hsl(var(--border)); }
  .border-primary\\/20 { border-color: hsl(var(--primary) / 0.2); }
  .border-destructive { border-color: hsl(var(--destructive)); }
  .border-destructive\\/20 { border-color: hsl(var(--destructive) / 0.2); }
  .border-destructive\\/50 { border-color: hsl(var(--destructive) / 0.5); }
  .border-current { border-color: currentColor; }
  .border-t-transparent { border-top-color: transparent; }
  
  .rounded { border-radius: 0.25rem; }
  .rounded-md { border-radius: calc(var(--radius) - 2px); }
  .rounded-lg { border-radius: var(--radius); }
  .rounded-full { border-radius: 9999px; }

  /* Shadow utilities */
  .shadow { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }
  .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
  .shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }

  /* Other utilities */
  .opacity-50 { opacity: 0.5; }
  .opacity-70 { opacity: 0.7; }
  .cursor-pointer { cursor: pointer; }
  .cursor-not-allowed { cursor: not-allowed; }
  .pointer-events-none { pointer-events: none; }
  .select-none { user-select: none; }
  .whitespace-nowrap { white-space: nowrap; }
  .break-all { word-break: break-all; }
  .object-contain { object-fit: contain; }
  .overflow-hidden { overflow: hidden; }
  .overflow-x-auto { overflow-x: auto; }
  .underline { text-decoration-line: underline; }
  .underline-offset-4 { text-underline-offset: 4px; }
  .transition-colors { 
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; 
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); 
    transition-duration: 150ms; 
  }
  .relative { position: relative; }
  .absolute { position: absolute; }
  .left-4 { left: 1rem; }
  .top-4 { top: 1rem; }
  .inline-block { display: inline-block; }
  .block { display: block; }
  .hidden { display: none; }
  .disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }
  .disabled\\:opacity-50:disabled { opacity: 0.5; }
  .peer-disabled\\:cursor-not-allowed:is(:disabled ~ *) { cursor: not-allowed; }
  .peer-disabled\\:opacity-70:is(:disabled ~ *) { opacity: 0.7; }

  /* Animation classes */
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Focus utilities */
  .focus-visible\\:outline-none:focus-visible { outline: 2px solid transparent; outline-offset: 2px; }
  .focus-visible\\:ring-1:focus-visible { box-shadow: 0 0 0 1px hsl(var(--ring)); }
  .focus-visible\\:ring-2:focus-visible { box-shadow: 0 0 0 2px hsl(var(--ring)); }
  .focus-visible\\:ring-ring:focus-visible { box-shadow: 0 0 0 2px hsl(var(--ring)); }
  .focus-visible\\:ring-offset-2:focus-visible { box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring)); }

  /* Hover utilities */
  .hover\\:bg-primary\\/90:hover { background-color: hsl(var(--primary) / 0.9); }
  .hover\\:bg-secondary\\/80:hover { background-color: hsl(var(--secondary) / 0.8); }
  .hover\\:bg-destructive\\/90:hover { background-color: hsl(var(--destructive) / 0.9); }
  .hover\\:bg-accent:hover { background-color: hsl(var(--accent)); }
  .hover\\:text-accent-foreground:hover { color: hsl(var(--accent-foreground)); }
  .hover\\:underline:hover { text-decoration-line: underline; }

  /* Dark mode utilities */
  .dark\\:border-destructive:is(.dark *) { border-color: hsl(var(--destructive)); }

  /* Specific component styles */
  [role="alert"] svg {
    position: absolute;
    left: 1rem;
    top: 1rem;
    color: hsl(var(--foreground));
  }

  [role="alert"] svg ~ * {
    padding-left: 1.75rem;
  }

  .\\[\\&\\>svg\\]\\:text-destructive > svg {
    color: hsl(var(--destructive));
  }

  .\\[\\&_p\\]\\:leading-relaxed p {
    line-height: 1.625;
  }

  /* Responsive utilities */
  @media (min-width: 768px) {
    .md\\:text-xl { font-size: 1.25rem; line-height: 1.75rem; }
    .md\\:text-5xl { font-size: 3rem; line-height: 1; }
  }

  /* File input styles */
  input[type="file"]::-webkit-file-upload-button {
    border: 0;
    background: transparent;
    font-size: 0.875rem;
    font-weight: 500;
  }

  input[type="file"]::file-selector-button {
    border: 0;
    background: transparent;
    font-size: 0.875rem;
    font-weight: 500;
  }

  /* Placeholder styles */
  input::placeholder,
  textarea::placeholder {
    color: hsl(var(--muted-foreground));
  }

  /* Pre/Code block styles */
  pre {
    margin: 0;
    font-size: 0.875rem;
  }

  code {
    font-size: 0.875rem;
  }

  /* Link styles */
  a.text-primary {
    color: hsl(var(--primary));
  }

  /* Form styles */
  input:focus,
  textarea:focus,
  select:focus {
    outline: none;
  }

  /* Details/Summary styles */
  details summary {
    cursor: pointer;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: hsl(var(--muted));
  }

  ::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
  }
`