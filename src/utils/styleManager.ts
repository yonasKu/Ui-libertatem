import { PLATFORM_SELECTORS, detectPlatform } from './platformSelectors';

export interface DetectedColor {
    value: string;
    count: number;
    elements: string[];
}

export type ColorMode = 'background' | 'text' | 'custom';

export interface ThemeOptions {
    mode: ColorMode;
    color: string;
    affectText: boolean;
    preserveImages: boolean;
}

export class StyleManager {
    private static readonly platformSelectors = PLATFORM_SELECTORS;

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

    static applyTheme = (options: ThemeOptions): boolean => {
        try {
            // Remove existing styles
            document.querySelectorAll('style[data-eglion-color]').forEach(el => el.remove());
            
            const style = document.createElement('style');
            style.setAttribute('data-eglion-color', 'true');
            
            let styleContent = '';
            const platform = StyleManager.detectPlatform();

            if (options.mode === 'background') {
                styleContent = StyleManager.generateBackgroundStyles(options.color, platform, options.affectText, options.preserveImages);
            } else if (options.mode === 'text') {
                styleContent = StyleManager.generateTextStyles(options.color, platform);
            }

            // Add universal selectors as fallback
            styleContent += StyleManager.generateUniversalStyles(options);

            style.textContent = styleContent;
            document.head.appendChild(style);

            // Handle iframes
            StyleManager.applyToIframes(options);

            return true;
        } catch (error) {
            console.error('Error applying theme:', error);
            return false;
        }
    };

    private static detectPlatform(): string {
        return detectPlatform();
    }

    private static generateBackgroundStyles(
        color: string, 
        platform: string, 
        affectText: boolean = true,
        preserveImages: boolean = false
    ): string {
        let styles = '';
        
        if (platform === 'youtube') {
            styles += `
                /* Force background on YouTube */
                ytd-app,
                ytd-watch-flexy,
                ytd-page-manager,
                #content,
                #page-manager,
                #columns,
                ytd-browse,
                div[class*="style-scope"] {
                    background-color: ${color} !important;
                }
                /* Override YouTube's background setting */
                html[dark],
                html[system-icons] {
                    --yt-spec-base-background: ${color} !important;
                    --yt-spec-raised-background: ${color} !important;
                    --yt-spec-menu-background: ${color} !important;
                }
            `;
        }

        // Continue with regular platform selectors...
        if (platform in StyleManager.platformSelectors) {
            const selectors = StyleManager.platformSelectors[platform].background;
            styles += `
                ${selectors.join(',')} {
                    background-color: ${color} !important;
                }
            `;
        }

        // Image handling
        if (!preserveImages) {
            styles += `
                img, video, iframe, canvas, svg {
                    background-color: transparent !important;
                }
            `;
        }

        return styles;
    }

    private static generateTextStyles(color: string, platform: string): string {
        let styles = '';
        
        if (platform in StyleManager.platformSelectors) {
            const selectors = StyleManager.platformSelectors[platform].text;
            styles += `
                ${selectors.join(',')} {
                    color: ${color} !important;
                }
            `;
        }

        return styles;
    }

    private static generateUniversalStyles(options: ThemeOptions): string {
        return `
            /* Universal selectors as fallback */
            html, body, #root, #__next, main, [role="main"] {
                ${options.mode === 'background' ? `background-color: ${options.color} !important;` : ''}
                ${options.mode === 'text' ? `color: ${options.color} !important;` : ''}
                ${options.mode === 'custom' ? `--theme-color: ${options.color} !important;` : ''}
            }
        `;
    }

    static applyBackgroundColor = (
        color: string, 
        affectText = true, 
        preserveImages = false,
        doc: Document = document
    ) => {
        const style = doc.createElement('style');
        style.setAttribute('data-eglion-color', 'true');
        
        style.textContent = `
            /* Universal background override */
            html, 
            body,
            #root,
            #__next,
            main,
            .main,
            article,
            .content,
            .container,
            [role="main"] {
                background-color: ${color} !important;
                ${affectText ? `color: ${StyleManager.getContrastColor(color)} !important;` : ''}
            }

            ${preserveImages ? '' : `
                img, 
                video,
                iframe,
                canvas,
                svg {
                    background-color: transparent !important;
                }
            `}
        `;

        doc.head.appendChild(style);
    };

    static applyTextColor = (color: string, doc: Document = document) => {
        const style = doc.createElement('style');
        style.setAttribute('data-eglion-color', 'true');
        
        style.textContent = `
            /* Text color override */
            body,
            p,
            span,
            h1, h2, h3, h4, h5, h6,
            a:not(:hover),
            div,
            li,
            input,
            textarea,
            select {
                color: ${color} !important;
            }
        `;

        doc.head.appendChild(style);
    };

    static applyCustomTheme = (color: string, doc: Document = document) => {
        const style = doc.createElement('style');
        style.setAttribute('data-eglion-color', 'true');
        
        style.textContent = `
            :root {
                --theme-color: ${color};
                --theme-color-rgb: ${StyleManager.hexToRgb(color)};
                --theme-contrast: ${StyleManager.getContrastColor(color)};
            }

            .theme-color,
            .accent-color,
            [data-theme-color] {
                color: var(--theme-color) !important;
            }

            .theme-background,
            [data-theme-background] {
                background-color: var(--theme-color) !important;
            }

            .theme-border,
            [data-theme-border] {
                border-color: var(--theme-color) !important;
            }
        `;

        doc.head.appendChild(style);
    };

    private static getContrastColor = (hexColor: string): string => {
        const rgb = StyleManager.hexToRgb(hexColor);
        if (!rgb) return '#000000';
        const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    };

    private static hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    private static applyToIframes(options: ThemeOptions) {
        try {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    if (iframe.contentDocument) {
                        // Remove existing styles in iframe
                        iframe.contentDocument.querySelectorAll('style[data-eglion-color]')
                            .forEach(el => el.remove());

                        const style = iframe.contentDocument.createElement('style');
                        style.setAttribute('data-eglion-color', 'true');
                        
                        let styleContent = '';
                        const platform = StyleManager.detectPlatform();

                        if (options.mode === 'background') {
                            styleContent = StyleManager.generateBackgroundStyles(
                                options.color, 
                                platform, 
                                options.affectText, 
                                options.preserveImages
                            );
                        } else if (options.mode === 'text') {
                            styleContent = StyleManager.generateTextStyles(options.color, platform);
                        }

                        // Add universal styles
                        styleContent += StyleManager.generateUniversalStyles(options);

                        style.textContent = styleContent;
                        iframe.contentDocument.head.appendChild(style);
                    }
                } catch (e) {
                    console.warn('Could not modify iframe:', e);
                }
            });
        } catch (error) {
            console.error('Error handling iframes:', error);
        }
    }
}
