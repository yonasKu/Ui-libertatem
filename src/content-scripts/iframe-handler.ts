// Listen for messages from the main page
window.addEventListener('message', (event) => {
    if (event.data.type === 'APPLY_BACKGROUND_COLOR') {
        try {
            // Remove any existing styles
            document.querySelectorAll('style[data-eglion-color]')
                .forEach(el => el.remove());

            // Create and append new style
            const style = document.createElement('style');
            style.setAttribute('data-eglion-color', 'true');
            style.textContent = event.data.styleContent;
            document.head.appendChild(style);

            // Propagate to nested iframes
            window.postMessage(event.data, '*');
        } catch (error) {
            console.warn('Error applying style to iframe:', error);
        }
    } else if (event.data.type === 'APPLY_FONT') {
        try {
            document.querySelectorAll('style[data-eglion-font]')
                .forEach(el => el.remove());
            document.querySelectorAll('link[data-eglion-font-link]')
                .forEach(el => el.remove());

            if (event.data.fontLink) {
                const link = document.createElement('link');
                link.setAttribute('data-eglion-font-link', 'true');
                link.href = event.data.fontLink;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }

            const style = document.createElement('style');
            style.setAttribute('data-eglion-font', 'true');
            style.textContent = event.data.styleContent;
            document.head.appendChild(style);

            window.postMessage(event.data, '*');
        } catch (error) {
            console.warn('Error applying font to iframe:', error);
        }
    }
}); 