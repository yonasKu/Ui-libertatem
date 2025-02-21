import Lion from "./assets/Lion.png";
import "./App.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { FontDetector, GoogleFont } from "./utils/fontDetector";
import { StyleManager, DetectedColor } from "./utils/styleManager";

function App() {

  const [font, setFont] = useState<string>("");
  const [detectedFonts, setDetectedFonts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fontChanger' | 'colorChanger'>('fontChanger');
  const [allFonts, setAllFonts] = useState<GoogleFont[]>([]);
  const [filteredFonts, setFilteredFonts] = useState<GoogleFont[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isApplyingFont, setIsApplyingFont] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [virtualizedFonts, setVirtualizedFonts] = useState<GoogleFont[]>([]);

  const ITEMS_PER_PAGE = 50;
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [detectedColors, setDetectedColors] = useState<DetectedColor[]>([]);
  const [affectText, setAffectText] = useState(true);
  const [preserveImages, setPreserveImages] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [textColor, setTextColor] = useState<string>("#000000");
  const [themeColor, setThemeColor] = useState<string>("#0066cc");

  const fontCategories = [
    { value: 'all', label: 'All Fonts' },
    { value: 'system-font', label: 'System Fonts' },
    { value: 'serif', label: 'Serif' },
    { value: 'sans-serif', label: 'Sans Serif' },
    { value: 'monospace', label: 'Monospace' },
    { value: 'display', label: 'Display' },
    { value: 'handwriting', label: 'Script' },
  ];

  useEffect(() => {
    const savedFont = localStorage.getItem("font");
    if (savedFont) setFont(savedFont);
  }, []);

  useEffect(() => {
    if (font) localStorage.setItem("font", font);
  }, [font]);

  useEffect(() => {
    const loadFonts = async () => {
      // Get Google fonts
      const googleFonts = FontDetector.getLocalFonts();

      // Get system fonts and convert to GoogleFont format
      const systemFonts = await FontDetector.getSystemFonts();
      const systemFontObjects: GoogleFont[] = systemFonts.map(font => ({
        family: font,
        category: 'system-font',
        variants: ['regular'],
        subsets: ['latin']
      }));

      // Combine both types of fonts
      const combinedFonts = [...googleFonts, ...systemFontObjects];
      setAllFonts(combinedFonts);
      setFilteredFonts(combinedFonts);

      // Set initial virtualized fonts
      setVirtualizedFonts(combinedFonts.slice(0, ITEMS_PER_PAGE));
    };

    loadFonts();
  }, []);

  // Filter fonts when search or category changes
  useEffect(() => {
    let newFilteredFonts = [...allFonts];

    // Apply search filter
    if (searchTerm) {
      newFilteredFonts = newFilteredFonts.filter(font =>
        font.family.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      newFilteredFonts = newFilteredFonts.filter(font =>
        font.category === selectedCategory
      );
    }

    setFilteredFonts(newFilteredFonts);
  }, [searchTerm, selectedCategory, allFonts]);

  const detectFonts = async () => {
    setError(null);
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) throw new Error("No active tab found");

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: FontDetector.detectPageFonts,
      });

      if (results?.[0]?.result) {
        setDetectedFonts(results[0].result);
      }
    } catch (error) {
      console.error("Error detecting fonts:", error);
      setError("Failed to detect fonts");
    }
  };

  const detectColors = async () => {
    setError(null);
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) throw new Error("No active tab found");

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: StyleManager.detectPageColors,
      });

      if (results?.[0]?.result) {
        setDetectedColors(results[0].result);
      }
    } catch (error) {
      console.error("Error detecting colors:", error);
      setError("Failed to detect colors");
    }
  };

  const applyFont = async () => {
    if (isApplyingFont || !selectedFont) return;

    setIsApplyingFont(true);
    setError(null);

    try {
      // First load the font if it's a Google Font
      const selectedFontData = allFonts.find(f => f.family === selectedFont);
      if (selectedFontData && selectedFontData.category !== 'system-font') {
        // Create a link element for Google Fonts
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${selectedFont.replace(/ /g, '+')}:wght@400;700&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        // Wait for font to load
        await new Promise((resolve) => {
          link.onload = resolve;
          // Fallback if onload doesn't fire
          setTimeout(resolve, 2000);
        });
      }

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        throw new Error("No active tab found");
      }

      // Then inject the font application script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (font: string) => {
          try {
            // Remove existing font styles
            const existingStyles = document.querySelectorAll('[data-eglion-font]');
            existingStyles.forEach(el => el.remove());

            // Load Google Font if needed
            const link = document.createElement('link');
            link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;700&display=swap`;
            link.rel = 'stylesheet';
            link.setAttribute('data-eglion-font', 'true');
            document.head.appendChild(link);

            // Create and append new style
            const style = document.createElement('style');
            style.setAttribute('data-eglion-font', 'true');

            style.textContent = `
                        /* Universal font override */
                        html body,
                        html body *:not(script):not(style):not(link),
                        body > *,
                        div, span, p, a, h1, h2, h3, h4, h5, h6,
                        input, button, select, textarea {
                            font-family: "${font}", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                        }

                        /* Force font on root level */
                        :root {
                            --font-family: "${font}", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                        }

                        /* Handle dynamic content */
                        * {
                            font-family: "${font}", -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
                        }
                    `;

            // Insert at the beginning of head
            document.head.insertBefore(style, document.head.firstChild);

            return true;
          } catch (error) {
            console.error('Error applying font:', error);
            return false;
          }
        },
        args: [selectedFont]
      });

      setFont(selectedFont);
    } catch (error) {
      console.error("Error in applyFont:", error);
      setError(error instanceof Error ? error.message : "Failed to apply font");
    } finally {
      setIsApplyingFont(false);
    }
  };

  const applyBackgroundColor = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) throw new Error("No active tab found");

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (color: string, affectText: boolean, preserveImages: boolean) => {
          try {
            document.querySelectorAll('style[data-eglion-background]').forEach(el => el.remove());
            const style = document.createElement('style');
            style.setAttribute('data-eglion-background', 'true');

            const contrastColor = (hex: string) => {
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
              return luminance > 0.5 ? '#000000' : '#ffffff';
            };

            style.textContent = `
              html, body { background-color: ${color} !important; }
              ${affectText ? `body { color: ${contrastColor(color)} !important; }` : ''}
              ${!preserveImages ? `
                img, video, iframe, canvas, svg {
                  background-color: transparent !important;
                }
              ` : ''}
            `;
            document.head.appendChild(style);
            return true;
          } catch (error) {
            console.error('Error in content script:', error);
            return false;
          }
        },
        args: [backgroundColor, affectText, preserveImages]
      });
    } catch (error) {
      console.error('Error applying background color:', error);
      setError(error instanceof Error ? error.message : "Failed to apply background color");
    }
  };

  const applyTextColor = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) throw new Error("No active tab found");

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (color: string) => {
          try {
            document.querySelectorAll('style[data-eglion-text]').forEach(el => el.remove());
            const style = document.createElement('style');
            style.setAttribute('data-eglion-text', 'true');
            style.textContent = `
              body, p, span, h1, h2, h3, h4, h5, h6,
              a:not(:hover), div, li, input, textarea, select {
                color: ${color} !important;
              }
            `;
            document.head.appendChild(style);
            return true;
          } catch (error) {
            console.error('Error in content script:', error);
            return false;
          }
        },
        args: [textColor]
      });
    } catch (error) {
      console.error('Error applying text color:', error);
      setError(error instanceof Error ? error.message : "Failed to apply text color");
    }
  };

  const applyThemeColor = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) throw new Error("No active tab found");

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (color: string) => {
          try {
            document.querySelectorAll('style[data-eglion-theme]').forEach(el => el.remove());
            const style = document.createElement('style');
            style.setAttribute('data-eglion-theme', 'true');
            style.textContent = `
              :root {
                --theme-color: ${color};
              }
              .theme-color, .accent-color, [data-theme-color] {
                color: var(--theme-color) !important;
              }
            `;
            document.head.appendChild(style);
            return true;
          } catch (error) {
            console.error('Error in content script:', error);
            return false;
          }
        },
        args: [themeColor]
      });
    } catch (error) {
      console.error('Error applying theme color:', error);
      setError(error instanceof Error ? error.message : "Failed to apply theme color");
    }
  };

  // Handle scroll and load more
  const handleScroll = useCallback(() => {
    if (!listRef.current || isLoadingMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setIsLoadingMore(true);

      // Filter from allFonts
      let filteredFonts = allFonts;
      if (searchTerm) {
        filteredFonts = filteredFonts.filter(font =>
          font.family.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      if (selectedCategory !== 'all') {
        filteredFonts = filteredFonts.filter(font =>
          font.category === selectedCategory
        );
      }

      // Load next batch
      const nextBatch = filteredFonts.slice(
        virtualizedFonts.length,
        virtualizedFonts.length + ITEMS_PER_PAGE
      );

      if (nextBatch.length > 0) {
        setVirtualizedFonts(prev => [...prev, ...nextBatch]);
      }
      setIsLoadingMore(false);
    }
  }, [virtualizedFonts.length, isLoadingMore, searchTerm, selectedCategory, allFonts]);

  // Add scroll listener
  useEffect(() => {
    const currentListRef = listRef.current;
    if (currentListRef) {
      currentListRef.addEventListener('scroll', handleScroll);
      return () => currentListRef.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Add an effect to trigger font detection on load
  useEffect(() => {
    if (activeTab === 'fontChanger') {
      detectFonts().catch(console.error);
    }
  }, []); // Run once on component mount

  return (
    <div className="app">
      <header>
        <img src={Lion} className="logo" alt="Logo" />
        <h1>Ui-libertatem</h1>
      </header>

      <nav className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'fontChanger' ? 'active' : ''}`}
          onClick={() => setActiveTab('fontChanger')}
        >
          Change Font
        </button>
        <button
          className={`tab-button ${activeTab === 'colorChanger' ? 'active' : ''}`}
          onClick={() => setActiveTab('colorChanger')}
        >
          Change Color
        </button>
      </nav>

      <main className="card">
        {activeTab === 'fontChanger' && (
          <div className="font-controls">
            <div className="font-control-header">
              <h3>Font Settings</h3>
              <button
                className="detect-fonts-btn"
                onClick={async () => {
                  await detectFonts();
                  if (detectedFonts.length > 0) {
                    setSelectedFont(detectedFonts[0]);
                  }
                }}
              >
                Detect Fonts
              </button>
            </div>

            <div className="font-selector-container">
              <div 
                className="font-selector-header"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span style={{ fontFamily: selectedFont || 'inherit' }}>
                  {selectedFont || 'Select a font'}
                </span>
                <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
              </div>

              {isDropdownOpen && (
                <div className="font-dropdown">
                  <div className="search-container">
                    <input
                      type="text"
                      placeholder="Search fonts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                      disabled={isApplyingFont}
                    />

                    <div className="category-filter">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="category-select"
                      >
                        {fontCategories.map(category => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="font-list">
                    {filteredFonts.map((font) => (
                      <div
                        key={font.family}
                        className={`font-item ${selectedFont === font.family ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedFont(font.family);
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          fontFamily: font.family,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>{font.family}</span>
                        <span className="font-badge">
                          {font.category === 'system-font' ? 'System' : font.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedFont && (
              <button
                onClick={applyFont}
                disabled={isApplyingFont}
                className="apply-button"
              >
                {isApplyingFont ? 'Applying...' : 'Apply Font'}
              </button>
            )}

            {detectedFonts.length > 0 && (
              <div className="detected-fonts-compact">
                <div className="detected-fonts-header">
                  <h4>Detected Fonts</h4>
                  <small>{detectedFonts.length} fonts found</small>
                </div>
                <div className="font-chips">
                  {detectedFonts.map((font, index) => (
                    <div
                      key={index}
                      className="font-chip"
                      title={font}
                      onClick={() => {
                        setSelectedFont(font);
                      }}
                    >
                      <span
                        className="font-chip-preview"
                        style={{ fontFamily: font }}
                      >
                        Aa
                      </span>
                      <span className="font-chip-value">{font}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {
          activeTab === 'colorChanger' && (
            <div className="color-controls">
              <div className="color-control-header">
                <h3>Color Settings</h3>
                <button
                  className="detect-colors-btn"
                  onClick={detectColors}
                >
                  Detect Colors
                </button>
              </div>

              <div className="color-control-grid">
                <div className="color-control-item">
                  <div className="color-label">Background</div>
                  <div className="color-input-row">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      title="Choose background color"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="color-hex-input"
                    />
                    <button
                      onClick={applyBackgroundColor}
                      className="apply-btn"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="color-options-compact">
                    <label title="Automatically adjust text color for better contrast">
                      <input
                        type="checkbox"
                        checked={affectText}
                        onChange={(e) => setAffectText(e.target.checked)}
                      />
                      <span>Auto text</span>
                    </label>
                    <label title="Keep image backgrounds unchanged">
                      <input
                        type="checkbox"
                        checked={preserveImages}
                        onChange={(e) => setPreserveImages(e.target.checked)}
                      />
                      <span>Keep images</span>
                    </label>
                  </div>
                </div>

                <div className="color-control-item">
                  <div className="color-label">Text</div>
                  <div className="color-input-row">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      title="Choose text color"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="color-hex-input"
                    />
                    <button
                      onClick={applyTextColor}
                      className="apply-btn"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="color-control-item">
                  <div className="color-label">Theme</div>
                  <div className="color-input-row">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      title="Choose theme color"
                    />
                    <input
                      type="text"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="color-hex-input"
                    />
                    <button
                      onClick={applyThemeColor}
                      className="apply-btn"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              {detectedColors.length > 0 && (
                <div className="detected-colors-compact">
                  <div className="detected-colors-header">
                    <h4>Detected Colors</h4>
                    <small>{detectedColors.length} colors found</small>
                  </div>
                  <div className="color-chips">
                    {detectedColors.map((color, index) => (
                      <div
                        key={index}
                        className="color-chip"
                        title={`${color.value} (used ${color.count} times)`}
                        onClick={() => {
                          const target = window.confirm('Set as background color? (Cancel for text color)')
                            ? setBackgroundColor
                            : setTextColor;
                          target(color.value);
                        }}
                      >
                        <div
                          className="color-chip-preview"
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="color-chip-value">{color.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        }

        {error && <p className="error">{error}</p>}
      </main >
    </div >
  );
}

export default App;