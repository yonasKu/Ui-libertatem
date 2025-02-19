import { PLATFORM_SELECTORS, detectPlatform } from '../utils/platformSelectors';
import { ThemeOptions } from '../utils/styleManager';

interface ExtendedThemeOptions extends ThemeOptions {
    platform: string;
}

let currentOptions: ExtendedThemeOptions | null = null;

// Handle dynamic content
const observer = new MutationObserver(() => {
    if (currentOptions) {
        applyTheme(currentOptions);
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((
    request: { type: string; options: ThemeOptions }, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response: { success: boolean }) => void
) => {
    if (sender.id !== chrome.runtime.id) return;

    if (request.type === 'applyTheme') {
        currentOptions = {
            ...request.options,
            platform: detectPlatform()
        };
        
        applyTheme(currentOptions);
        sendResponse({ success: true });
    }
});

function applyTheme(options: ExtendedThemeOptions): void {
    // Remove existing styles
    document.querySelectorAll('style[data-theme-styles]').forEach(el => el.remove());

    // Create new style element
    const style = document.createElement('style');
    style.setAttribute('data-theme-styles', '');
    style.textContent = generateStyles(options);
    document.head.appendChild(style);

    // Start observing for dynamic content
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function generateStyles(options: ExtendedThemeOptions): string {
    const platform = options.platform;
    const selectors = PLATFORM_SELECTORS[platform];
    let styles = '';

    if (options.mode === 'background') {
        // Platform-specific styles
        if (selectors?.background) {
            styles += `
                ${selectors.background.join(',')} {
                    background-color: ${options.color} !important;
                }
            `;
        }

        // Platform-specific variables
        if (platform === 'youtube') {
            styles += `
                :root {
                    --yt-spec-base-background: ${options.color} !important;
                    --yt-spec-raised-background: ${options.color} !important;
                    --yt-spec-menu-background: ${options.color} !important;
                    --yt-spec-inverted-background: ${options.color} !important;
                }
            `;
        }
    } else if (options.mode === 'text') {
        if (selectors?.text) {
            styles += `
                ${selectors.text.join(',')} {
                    color: ${options.color} !important;
                }
            `;
        }
    }

    // Universal fallback
    styles += `
        html, body, #root, #__next, main, [role="main"] {
            ${options.mode === 'background' ? `background-color: ${options.color} !important;` : ''}
            ${options.mode === 'text' ? `color: ${options.color} !important;` : ''}
        }
    `;

    return styles;
}