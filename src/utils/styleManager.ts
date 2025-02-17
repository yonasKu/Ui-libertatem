export class StyleManager {
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
