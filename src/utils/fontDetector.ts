import fonts from '../assets/fonts.json';

export interface GoogleFont {
  family: string;
  category: string;
  variants: string[];
  files?: Record<string, string>;
  subsets?: string[];
}

interface FontsJson {
  kind: string;
  items: GoogleFont[];
}

export class FontDetector {
  private static systemFonts: string[] | null = null;
  private static localFonts: GoogleFont[] = (fonts as FontsJson).items;
  private static PAGE_SIZE = 100; // Number of fonts to load at once
  private static currentPage = 0;

  /**
   * Detects all unique fonts used on the current page, including web fonts
   * @returns Promise<string[]> Array of unique font names
   */
  static detectPageFonts = () => {
    try {
      const elements = document.querySelectorAll("*");
      const fonts = new Set<string>();

      // Check for web fonts
      Array.from(document.styleSheets).forEach(stylesheet => {
        try {
          Array.from(stylesheet.cssRules || []).forEach(rule => {
            if (rule instanceof CSSFontFaceRule) {
              const fontFamily = rule.style.getPropertyValue('font-family').replace(/['"]/g, '');
              fonts.add(`📦 ${fontFamily} (Web Font)`);
            }
          });
        } catch (e) {
          console.warn('Skipping CORS-protected stylesheet:', e);
        }
      });

      // Check used fonts
      elements.forEach((el) => {
        const computedStyle = window.getComputedStyle(el);
        const fontFamilies = computedStyle.fontFamily
          .split(",")
          .map((f) => f.trim().replace(/['"]/g, ''));
        fontFamilies.forEach((font) => {
          if (!font.includes('(Web Font)')) {
            fonts.add(font);
          }
        });
      });

      return Array.from(fonts);
    } catch (error) {
      console.error('Error detecting fonts:', error);
      return [];
    }
  };

  /**
   * Gets available system fonts
   * @returns Promise<string[]> Array of system fonts
   */
  static async getSystemFonts(): Promise<string[]> {
    // Return cached fonts if available
    if (this.systemFonts) {
      return this.systemFonts;
    }

    // Helper function to check if a font is available
    const isFontAvailable = (fontFamily: string): boolean => {
      // Test characters that look different in different fonts
      const testString = 'mmmmmmmmmmlli';
      
      // Create canvas elements for comparison
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return false;

      // Set a base size for better comparison
      context.font = '72px monospace';
      const baseWidth = context.measureText(testString).width;

      // Test with the target font
      context.font = `72px ${fontFamily}, monospace`;
      const testWidth = context.measureText(testString).width;

      // Compare widths - if they're different, the font is available
      return baseWidth !== testWidth;
    };

    // Comprehensive list of system fonts
    const fontFamilies = [
      // Windows 10
      'Arial', 'Arial Black', 'Bahnschrift', 'Calibri', 'Cambria', 'Cambria Math', 
      'Candara', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 
      'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 'HoloLens MDL2 Assets', 
      'Impact', 'Ink Free', 'Javanese Text', 'Leelawadee UI', 'Lucida Console', 
      'Lucida Sans Unicode', 'Malgun Gothic', 'Marlett', 'Microsoft Himalaya', 
      'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif', 
      'Microsoft Tai Le', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 
      'Mongolian Baiti', 'MS Gothic', 'MV Boli', 'Myanmar Text', 'Nirmala UI', 
      'Palatino Linotype', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Script', 
      'Segoe UI', 'Segoe UI Historic', 'Segoe UI Emoji', 'Segoe UI Symbol', 
      'SimSun', 'Sitka', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman', 
      'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic',

      // macOS
      '-apple-system', 'SF Pro Text', 'SF Pro Display', 'SF Mono', 'Helvetica Neue',
      'Helvetica', 'Monaco', 'Apple Color Emoji', '.AppleSystemUIFont', 'Avenir',
      'Avenir Next', 'Avenir Next Condensed', 'Baskerville', 'Big Caslon', 'Copperplate',
      'Didot', 'Futura', 'Geneva', 'Gill Sans', 'Hoefler Text', 'Lucida Grande',
      'Menlo', 'Optima', 'Palatino', 'San Francisco', 'Thonburi', 'Zapfino',

      // Linux
      'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif', 'Liberation Mono',
      'Liberation Sans', 'Liberation Serif', 'Noto Sans', 'Noto Serif', 'Ubuntu',
      'Ubuntu Mono', 'Droid Sans', 'Droid Serif', 'Roboto', 'Open Sans',

      // Web-safe fonts
      'system-ui', 'Fira Sans', 'Lato', 'Montserrat', 'Noto Sans', 'Open Sans',
      'Roboto', 'Source Sans Pro', 'Ubuntu'
    ];

    // Test and filter available fonts
    this.systemFonts = fontFamilies.filter(font => {
      try {
        return isFontAvailable(font);
      } catch (e) {
        console.warn(`Error testing font ${font}:`, e);
        return false;
      }
    }).sort();

    // Add system font groups
    const systemFontGroups = [
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'Oxygen-Sans',
      'Ubuntu',
      'Cantarell',
      'Helvetica Neue',
      'sans-serif'
    ];

    this.systemFonts = [...new Set([...this.systemFonts, ...systemFontGroups])];

    return this.systemFonts;
  }

  /**
   * Gets a page of fonts from local json
   */
  static getLocalFonts(searchTerm: string = ''): GoogleFont[] {
    if (!searchTerm.trim()) {
      return this.localFonts;
    }

    return this.localFonts.filter(font =>
      font.family.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  /**
   * Load more fonts
   */
  static loadMoreFonts(): boolean {
    const totalPages = Math.ceil(this.localFonts.length / this.PAGE_SIZE);
    if (this.currentPage < totalPages - 1) {
      this.currentPage++;
      return true;
    }
    return false;
  }

  /**
   * Reset pagination
   */
  static resetPagination() {
    this.currentPage = 0;
  }

  /**
   * Applies a font to the page
   */
  static applyFont = (fontFamily: string) => {
    try {
      // Remove existing font styles
      const existingStyles = document.querySelectorAll('[data-eglion-font]');
      existingStyles.forEach(el => el.remove());

      // Create and append new style
      const style = document.createElement('style');
      style.setAttribute('data-eglion-font', 'true');
      
      // More specific and aggressive CSS
      style.textContent = `
        /* Universal font override */
        html body,
        html body *:not(script):not(style):not(link),
        body > *,
        div, span, p, a, h1, h2, h3, h4, h5, h6,
        input, button, select, textarea {
          font-family: "${fontFamily}", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
        }

        /* Force font on root level */
        :root {
          --font-family: "${fontFamily}", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
        }

        /* Handle dynamic content */
        * {
          font-family: "${fontFamily}", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
        }
      `;

      // Append the style to the head
      document.head.appendChild(style);

      // Apply to same-origin iframes
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          if (iframe.contentDocument) {
            const iframeStyle = iframe.contentDocument.createElement('style');
            iframeStyle.setAttribute('data-eglion-font', 'true');
            iframeStyle.textContent = style.textContent;
            iframe.contentDocument.head.appendChild(iframeStyle);
          }
        } catch (e) {
          console.warn('Skipping cross-origin iframe:', e);
        }
      });

      return true;
    } catch (error) {
      console.error('Error in applyFont:', error);
      return false;
    }
  };
}