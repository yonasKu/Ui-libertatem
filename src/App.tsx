import Lion from "./assets/Lion.png";
import "./App.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { FontDetector, GoogleFont } from "./utils/fontDetector";
import { StyleManager, DetectedColor } from "./utils/styleManager";

function App() {
  const [colour, setColour] = useState<string>("");
  const [font, setFont] = useState<string>("");
  const [detectedFonts, setDetectedFonts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fontDetector' | 'fontChanger' | 'colorChanger'>('fontDetector');
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

  const applyColor = async () => {
    setError(null);
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      
      if (!tab?.id) throw new Error("No active tab found");

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [colour],
        func: StyleManager.applyBackgroundColor,
      });
    } catch (error) {
      console.error("Error applying color:", error);
      setError("Failed to apply color");
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

  return (
    <div className="app">
      <header>
        <img src={Lion} className="logo" alt="Logo" />
        <h1>Ui-libertatem</h1>
      </header>

      <nav className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'fontDetector' ? 'active' : ''}`}
          onClick={() => setActiveTab('fontDetector')}
        >
          Detect Fonts
        </button>
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
        {activeTab === 'fontDetector' && (
          <div>
            <button 
              onClick={detectFonts}
              disabled={isApplyingFont}
            >
              Detect Page Fonts
            </button>
            {detectedFonts.length > 0 && (
              <div className="detected-fonts">
                <h3>Detected Fonts:</h3>
                <ul>
                  {detectedFonts.map((font, index) => (
                    <li 
                      key={index}
                      onClick={() => {
                        setSelectedFont(font);
                        setActiveTab('fontChanger');
                      }}
                      className={isApplyingFont ? 'disabled' : ''}
                    >
                      {font}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fontChanger' && (
          <div>
            <div className="font-selector-container">
              <div 
                className="font-selector-header"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span style={{ fontFamily: selectedFont || 'inherit' }}>
                  {selectedFont || 'Select a font'}
                </span>
                <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>
                  ▼
                </span>
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
          </div>
        )}

        {activeTab === 'colorChanger' && (
          <div>
            <button onClick={detectColors}>Detect Page Colors</button>
            
            {detectedColors.length > 0 && (
                <div className="detected-colors">
                    <h3>Detected Colors:</h3>
                    <div className="color-grid">
                        {detectedColors.map((color, index) => (
                            <div 
                                key={index} 
                                className="color-item"
                                onClick={() => setColour(color.value)}
                            >
                                <div 
                                    className="color-preview" 
                                    style={{ 
                                        backgroundColor: color.value,
                                        border: '1px solid var(--border-color)'
                                    }}
                                />
                                <div className="color-info">
                                    <span>{color.value}</span>
                                    <small>Used {color.count} times</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <label>Choose Background Color:</label>
            <input
                type="color"
                onChange={(e) => setColour(e.target.value)}
                value={colour}
            />
            <button onClick={applyColor}>Apply Color</button>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </main>
    </div>
  );
}

export default App;