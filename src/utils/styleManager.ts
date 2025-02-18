export interface DetectedColor {
    value: string;
    count: number;
    elements: string[]; // Store selectors or element descriptions
}

export class StyleManager {
    static detectPageColors = (): DetectedColor[] => {
        try {
            const colorMap = new Map<string, DetectedColor>();
            
            // Helper function to convert RGB/RGBA to HEX
            const rgbToHex = (rgb: string): string => {
                // Handle rgba
                if (rgb.startsWith('rgba')) {
                    const matches = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
                    if (!matches) return rgb;
                    const r = parseInt(matches[1]);
                    const g = parseInt(matches[2]);
                    const b = parseInt(matches[3]);
                    const a = matches[4] ? parseFloat(matches[4]) : 1;
                    
                    if (a === 1) {
                        return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
                    }
                    return rgb; // Keep rgba format if alpha != 1
                }
                
                // Handle rgb
                if (rgb.startsWith('rgb')) {
                    const matches = rgb.match(/^rgb?\((\d+),\s*(\d+),\s*(\d+)\)$/);
                    if (!matches) return rgb;
                    const r = parseInt(matches[1]);
                    const g = parseInt(matches[2]);
                    const b = parseInt(matches[3]);
                    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
                }
                
                return rgb;
            };

            // Extract colors from box-shadow
            const extractShadowColors = (shadow: string): string[] => {
                const colors: string[] = [];
                const colorRegex = /(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi;
                const matches = shadow.match(colorRegex);
                if (matches) {
                    colors.push(...matches);
                }
                return colors;
            };

            // Helper function to add color to map
            const addColor = (color: string, element: string) => {
                const hexColor = rgbToHex(color.toLowerCase());
                if (hexColor === 'transparent' || hexColor === 'inherit' || hexColor === 'initial' || hexColor === 'none') return;
                
                if (colorMap.has(hexColor)) {
                    const existing = colorMap.get(hexColor)!;
                    existing.count++;
                    if (!existing.elements.includes(element)) {
                        existing.elements.push(element);
                    }
                } else {
                    colorMap.set(hexColor, {
                        value: hexColor,
                        count: 1,
                        elements: [element]
                    });
                }
            };

            // Get all elements
            const elements = document.querySelectorAll('*');
            
            elements.forEach((el) => {
                const computedStyle = window.getComputedStyle(el);
                const elementDesc = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${Array.from(el.classList).map(c => '.' + c).join('')}`;

                // Check background colors
                const backgroundColor = computedStyle.backgroundColor;
                if (backgroundColor) {
                    addColor(backgroundColor, `${elementDesc} (background)`);
                }

                // Check text color
                const color = computedStyle.color;
                if (color) {
                    addColor(color, `${elementDesc} (text)`);
                }

                // Check border colors (all sides)
                ['Top', 'Right', 'Bottom', 'Left'].forEach(side => {
                    const borderColor = computedStyle.getPropertyValue(`border-${side.toLowerCase()}-color`);
                    const borderWidth = computedStyle.getPropertyValue(`border-${side.toLowerCase()}-width`);
                    if (borderColor && borderWidth !== '0px') {
                        addColor(borderColor, `${elementDesc} (border-${side.toLowerCase()})`);
                    }
                });

                // Check outline color
                const outlineColor = computedStyle.outlineColor;
                const outlineWidth = computedStyle.outlineWidth;
                if (outlineColor && outlineWidth !== '0px') {
                    addColor(outlineColor, `${elementDesc} (outline)`);
                }

                // Check box-shadow
                const boxShadow = computedStyle.boxShadow;
                if (boxShadow && boxShadow !== 'none') {
                    const shadowColors = extractShadowColors(boxShadow);
                    shadowColors.forEach(shadowColor => {
                        addColor(shadowColor, `${elementDesc} (box-shadow)`);
                    });
                }

                // Check text-shadow
                const textShadow = computedStyle.textShadow;
                if (textShadow && textShadow !== 'none') {
                    const shadowColors = extractShadowColors(textShadow);
                    shadowColors.forEach(shadowColor => {
                        addColor(shadowColor, `${elementDesc} (text-shadow)`);
                    });
                }

                // Check caret color
                const caretColor = computedStyle.caretColor;
                if (caretColor && caretColor !== 'auto') {
                    addColor(caretColor, `${elementDesc} (caret)`);
                }

                // Check text decoration color
                const textDecorationColor = computedStyle.textDecorationColor;
                if (textDecorationColor) {
                    addColor(textDecorationColor, `${elementDesc} (text-decoration)`);
                }
            });

            // Check CSS Variables (Custom Properties)
            const rootStyle = getComputedStyle(document.documentElement);
            for (const prop of rootStyle) {
                if (prop.startsWith('--') && (
                    prop.includes('color') || 
                    prop.includes('background') || 
                    prop.includes('border') ||
                    prop.includes('shadow') ||
                    prop.includes('outline')
                )) {
                    const value = rootStyle.getPropertyValue(prop).trim();
                    if (value.match(/#|rgb|hsl/i)) {
                        addColor(value, `CSS Variable: ${prop}`);
                    }
                }
            }

            // Sort colors by usage count
            return Array.from(colorMap.values())
                .sort((a, b) => b.count - a.count);

        } catch (error) {
            console.error('Error detecting colors:', error);
            return [];
        }
    };

    static applyBackgroundColor = (color: string) => {
        try {
            // Remove existing color styles
            document.querySelectorAll('style[data-eglion-color]').forEach(el => el.remove());
            const style = document.createElement('style');
            style.setAttribute('data-eglion-color', 'true');

            // Universal selectors + Platform specific selectors
            style.textContent = `
        /* Universal Selectors */
        html, 
        body,
        #root,
        #__next,
        main,
        .main,
        article,
        .content,
        .container {
          background-color: ${color} !important;
        }

        /* YouTube Specific */
        ytd-app,
        #content,
        ytd-browse,
        ytd-two-column-browse-results-renderer,
        ytd-rich-grid-renderer,
        ytd-watch-flexy,
        #primary,
        ytd-guide-renderer,
        #guide-content,
        ytd-mini-guide-renderer,
        ytd-multi-page-menu-renderer,
        .html5-video-player {
          background-color: ${color} !important;
        }

        /* Twitter/X Specific */
        .r-backgroundColor-1niwhzg,
        [data-testid="primaryColumn"],
        .css-1dbjc4n,
        .r-14lw9ot,
        .r-13qz1uu {
          background-color: ${color} !important;
        }

        /* Facebook Specific */
        ._li,
        .x1n2onr6,
        .x1vjfegm,
        ._6s5d,
        ._5h60 {
          background-color: ${color} !important;
        }

        /* LinkedIn Specific */
        .scaffold-layout__main,
        .feed-shared-update-v2,
        .core-rail,
        .scaffold-layout {
          background-color: ${color} !important;
        }

        /* Gmail Specific */
        .ain,
        .aic,
        .nH,
        .no,
        .gb_Fd {
          background-color: ${color} !important;
        }

        /* Reddit Specific */
        .MainLayout,
        .Post,
        ._1VP69d9lk-Wk9zokOaylL,
        .SubredditVars-r-popular {
          background-color: ${color} !important;
        }

        /* Google Specific */
        .RNNXgb,
        #search,
        #main,
        .sfbg,
        .minidiv {
          background-color: ${color} !important;
        }

        /* Netflix Specific */
        .mainView,
        .watch-video,
        .netflix-sans-font-loaded {
          background-color: ${color} !important;
        }

        /* Amazon Specific */
        #nav-belt,
        #nav-main,
        #desktop-grid-1,
        .s-desktop-content {
          background-color: ${color} !important;
        }

        /* Generic Modern Web Apps */
        [role="main"],
        [role="content"],
        [role="presentation"],
        .wrapper,
        .page-content,
        .content-wrapper,
        .main-content,
        .app-content,
        #app,
        #page-content,
        .page-wrapper,
        .viewport-container {
          background-color: ${color} !important;
        }

        /* Common class patterns */
        [class*="background"],
        [class*="bg-"],
        [class*="Background"],
        [class*="container"],
        [class*="wrapper"],
        [class*="content"],
        [class*="main"] {
          background-color: ${color} !important;
        }

        /* Shadow DOM support */
        :host,
        ::shadow,
        /deep/ {
          background-color: ${color} !important;
        }
      `;

            document.head.appendChild(style);

            // New approach for handling iframes
            const message = {
                type: 'APPLY_BACKGROUND_COLOR',
                color: color,
                styleContent: style.textContent
            };

            // Broadcast message to all frames
            window.postMessage(message, '*');

            // For same-origin iframes, we can still apply directly
            const sameOriginIframes = Array.from(document.querySelectorAll('iframe')).filter(iframe => {
                try {
                    return !!iframe.contentDocument;
                } catch {
                    return false;
                }
            });

            sameOriginIframes.forEach(iframe => {
                try {
                    const iframeStyle = iframe.contentDocument!.createElement('style');
                    iframeStyle.setAttribute('data-eglion-color', 'true');
                    iframeStyle.textContent = style.textContent;
                    iframe.contentDocument!.head.appendChild(iframeStyle);
                } catch (e) {
                    console.warn('Could not modify same-origin iframe:', e);
                }
            });

        } catch (error) {
            console.error('Error applying color:', error);
        }
    };
}
