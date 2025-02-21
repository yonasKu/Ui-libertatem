export interface PlatformSelectors {
    [key: string]: {
        background: string[];
        text: string[];
    };
}

export const PLATFORM_SELECTORS: PlatformSelectors = {
    youtube: {
        background: [
            'html',
            'body',
            'ytd-app',
            'ytd-watch-flexy',
            'ytd-watch-flexy[video-id]',
            'ytd-page-manager',
            'ytd-browse[page-subtype="home"]',
            'ytd-browse[role="main"]',
            'ytd-two-column-browse-results-renderer',
            '#content',
            '#page-manager',
            '#columns',
            '#primary',
            '#secondary',
            'ytd-masthead',
            '#masthead-container',
            'ytd-rich-grid-renderer',
            'ytd-rich-item-renderer',
            '.ytd-app',
            '.ytd-watch-flexy',
            '.ytd-page-manager',
            '.ytd-browse',
            '.ytd-rich-grid-renderer',
            'div[id="content"]',
            'div[id="container"]',
            'div[class*="style-scope"]',
            '#player-container-inner',
            '#player-container-outer'
        ],
        text: [
            '.ytd-video-primary-info-renderer',
            '#video-title', '.ytd-channel-name',
            '.ytd-video-meta-block', '#content-text',
            '.ytd-comment-thread-renderer'
        ]
    },
    twitter: {
        background: [
            'body', '[data-testid="primaryColumn"]',
            '.r-backgroundColor-1niwhzg',
            '.css-1dbjc4n', '[role="main"]',
            '.r-14lw9ot', '.r-kemksi'
        ],
        text: [
            '[data-testid="tweetText"]',
            '.css-901oao', '.r-18jsvk2',
            '.r-1qd0xha', '.r-a023e6'
        ]
    },
    facebook: {
        background: [
            'body', '#facebook', '.x9f619',
            '.x1yztbdb', '.x1n2onr6',
            '[role="main"]', '.x1hc1fzr',
            '.x78zum5', '.xdt5ytf'
        ],
        text: [
            '.x193iq5w', '.xzsf02u',
            '.x1lliihq', '.x1lkfr7t',
            '.x1roi4f4', '.x1s688f'
        ]
    },
    linkedin: {
        background: [
            'body', '.scaffold-layout__main',
            '.feed-shared-update-v2',
            '.core-rail', '.scaffold-layout',
            '.authentication-outlet'
        ],
        text: [
            '.feed-shared-update-v2__description',
            '.share-update-card__update-text',
            '.feed-shared-text',
            '.artdeco-button__text'
        ]
    },
    gmail: {
        background: [
            'body', '.ain', '.aeF',
            '.nH', '.ha', '.gb_ld',
            '.brC-brG', '.bkK'
        ],
        text: [
            '.a3s', '.g2', '.h7',
            '.gE', '.gs', '.g0'
        ]
    },
    reddit: {
        background: [
            'body', '.MainLayout',
            '.Post', '[data-testid="post-container"]',
            '.Comment', '.SubredditVars-r-all',
            '_1voNNrag0yA8M-UUUYnAWH'
        ],
        text: [
            '.Post-title', '.Comment-body',
            '.Post-content', '._1qeIAgB0cPwnLhDF9XSiJM',
            '.TitleTextAlignment'
        ]
    },
    google: {
        background: [
            'body', '#main', '#search',
            '.g', '#rso', '#appbar',
            '#rcnt', '#center_col'
        ],
        text: [
            '.LC20lb', '.VwiC3b', '.st',
            '.aCOpRe', '.IsZvec'
        ]
    },
    netflix: {
        background: [
            'body', '.netflix-sans-font-loaded',
            '.mainView', '.watch-video',
            '.detail-modal', '.jawBone',
            '.lolomo', '.bob-card'
        ],
        text: [
            '.title-name', '.episode-title',
            '.synopsis', '.fallback-text',
            '.preview-modal-synopsis'
        ]
    },
    amazon: {
        background: [
            'body', '#dp', '#desktop_unifiedPrice',
            '#centerCol', '#ppd', '#nav-belt',
            '#nav-main', '#search'
        ],
        text: [
            '#productTitle', '.a-color-base',
            '.a-text-normal', '.a-size-base',
            '.a-link-normal'
        ]
    }
};

export const detectPlatform = (): string => {
    const hostname = window.location.hostname;
    const platforms = {
        'youtube.com': 'youtube',
        'twitter.com': 'twitter',
        'x.com': 'twitter',
        'facebook.com': 'facebook',
        'linkedin.com': 'linkedin',
        'gmail.com': 'gmail',
        'reddit.com': 'reddit',
        'google.com': 'google',
        'netflix.com': 'netflix',
        'amazon': 'amazon'
    };

    return Object.entries(platforms).find(([domain]) => 
        hostname.includes(domain))?.[1] || 'universal';
}; 