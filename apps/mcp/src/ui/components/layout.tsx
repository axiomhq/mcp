import type { FC } from 'hono/jsx';
import { Link, Text } from '../base';
import type { BaseProps } from '../base/types';

interface LayoutProps extends BaseProps {
  title: string;
}

export const Layout: FC<LayoutProps> = ({ title, children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <title>{title}</title>
        {/* Tailwind CSS from CDN */}
        <script src="https://cdn.tailwindcss.com" />
        {/* Theme initialization script */}
        <script
          // biome-ignore lint: _
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Check if we're on localhost
                const isLocalhost = window.location.hostname === 'localhost' ||
                                   window.location.hostname === '127.0.0.1' ||
                                   window.location.hostname.startsWith('192.168.');

                // Get stored theme or use system preference
                function getTheme() {
                  const stored = localStorage.getItem('axiom-mcp-theme');
                  if (stored) return stored;

                  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    return 'dark';
                  }
                  return 'light';
                }

                // Apply theme to document
                function applyTheme(theme) {
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }

                // Initialize theme
                const theme = getTheme();
                applyTheme(theme);

                // Store for use in theme toggle
                window.__axiomTheme = {
                  current: theme,
                  isLocalhost: isLocalhost,
                  apply: applyTheme,
                  toggle: function() {
                    const newTheme = this.current === 'dark' ? 'light' : 'dark';
                    this.current = newTheme;
                    localStorage.setItem('axiom-mcp-theme', newTheme);
                    applyTheme(newTheme);
                    this.updateIcon();
                  },
                  updateIcon: function() {
                    const btn = document.getElementById('theme-toggle-btn');
                    if (!btn) return;

                    const sunIcon = btn.querySelector('.sun-icon');
                    const moonIcon = btn.querySelector('.moon-icon');

                    if (this.current === 'dark') {
                      sunIcon.style.display = 'block';
                      moonIcon.style.display = 'none';
                    } else {
                      sunIcon.style.display = 'none';
                      moonIcon.style.display = 'block';
                    }
                  }
                };

                // Listen for system theme changes
                if (window.matchMedia) {
                  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
                    // Only auto-switch if no manual preference is stored
                    if (!localStorage.getItem('axiom-mcp-theme')) {
                      const newTheme = e.matches ? 'dark' : 'light';
                      window.__axiomTheme.current = newTheme;
                      applyTheme(newTheme);
                      window.__axiomTheme.updateIcon();
                    }
                  });
                }
              })();
            `,
          }}
        />
        {/* Configure Tailwind */}
        <script
          // biome-ignore lint: _
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                darkMode: 'class',
                corePlugins: {
                  preflight: false,
                },
                important: '.axiom-auth-ui',
                theme: {
                  extend: {
                    colors: {
                      gray: {
                        50: '#fafafa',
                        100: '#f5f5f5',
                        200: '#e5e5e5',
                        300: '#d4d4d4',
                        400: '#a3a3a3',
                        500: '#737373',
                        600: '#525252',
                        700: '#404040',
                        800: '#262626',
                        900: '#171717',
                        950: '#0a0a0a',
                      }
                    },
                    fontFamily: {
                      'mono': ['Berkeley Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
                      'sans': ['Berkeley Mono', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
                    },
                    animation: {
                      'delay-300': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    },
                    keyframes: {
                      pulse: {
                        '0%, 100%': { opacity: '1' },
                        '50%': { opacity: '.5' },
                      }
                    }
                  }
                }
              }
            `,
          }}
        />
        {/* Scoped reset styles to prevent conflicts */}
        <style
          // biome-ignore lint: _
          dangerouslySetInnerHTML={{
            __html: `
              /* Scope all styles to our auth UI */
              .axiom-auth-ui {
                /* Reset styles within our container */
                font-family: 'Berkeley Mono', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
                line-height: 1.5;
                -webkit-text-size-adjust: 100%;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                /* Reset specific properties instead of using all: initial */
                margin: 0;
                padding: 0;
                border: 0;
                font-size: 100%;
                vertical-align: baseline;
              }

              /* Ensure Tailwind styles apply within our container */
              .axiom-auth-ui * {
                box-sizing: border-box;
                border-width: 0;
                border-style: solid;
                border-color: #e5e7eb;
              }

              /* Reset form elements */
              .axiom-auth-ui button,
              .axiom-auth-ui input,
              .axiom-auth-ui optgroup,
              .axiom-auth-ui select,
              .axiom-auth-ui textarea {
                font-family: inherit;
                font-size: 100%;
                font-weight: inherit;
                line-height: inherit;
                margin: 0;
                padding: 0;
              }

              /* Reset links */
              .axiom-auth-ui a {
                color: inherit;
                text-decoration: inherit;
              }

              /* Don't override button colors */
              .axiom-auth-ui button {
                color: unset;
              }

              /* Animation utilities */
              .animation-delay-300 {
                animation-delay: 300ms;
              }

              /* Custom fonts */
              @font-face {
                font-family: 'Berkeley Mono';
                src: url('https://axiom.co/fonts/BerkeleyMono-Regular.woff2') format('woff2');
                font-weight: normal;
                font-style: normal;
              }

              @font-face {
                font-family: 'Berkeley Mono';
                src: url('https://axiom.co/fonts/BerkeleyMono-Bold.woff2') format('woff2');
                font-weight: 700;
                font-style: normal;
              }
            `,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <div className="axiom-auth-ui">
          {/* Theme toggle button - only shown on localhost */}
          <script
            // biome-ignore lint: _
            dangerouslySetInnerHTML={{
              __html: `
                if (window.__axiomTheme && window.__axiomTheme.isLocalhost) {
                  document.write(\`
                    <button
                      id="theme-toggle-btn"
                      onclick="window.__axiomTheme.toggle()"
                      style="
                        position: fixed;
                        bottom: 24px;
                        right: 24px;
                        width: 48px;
                        height: 48px;
                        border-radius: 50%;
                        background: rgba(31, 41, 55, 0.9);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        z-index: 9999;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                      "
                      onmouseover="this.style.transform='scale(1.1)'"
                      onmouseout="this.style.transform='scale(1)'"
                      aria-label="Toggle theme"
                    >
                      <!-- Sun icon for dark mode -->
                      <svg
                        class="sun-icon"
                        style="display: none; width: 24px; height: 24px;"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
                      </svg>
                      <!-- Moon icon for light mode -->
                      <svg
                        class="moon-icon"
                        style="display: none; width: 24px; height: 24px;"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
                      </svg>
                    </button>
                  \`);

                  // Update icon after DOM is ready
                  setTimeout(function() {
                    window.__axiomTheme.updateIcon();
                  }, 0);
                }
              `,
            }}
          />
          <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12 font-mono dark:bg-gray-900">
            <div className="w-full max-w-lg">
              <main>{children}</main>
              <footer className="mt-8 text-center text-xs ">
                <Text variant="muted">
                  By using Axiom, you agree to its
                  <br />
                  <Link
                    href="https://axiom.co/docs/legal/terms-of-service"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="https://axiom.co/docs/legal/privacy"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Privacy Policy
                  </Link>
                </Text>
              </footer>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};
