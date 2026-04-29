const STORAGE_KEYS = {
    THEME: "theme",
    PERSISTENT_LOGIN: "persistentLogin",
    COOKIE_DURATION: "cookieDuration"
};

const THEMES = {
    DEFAULT: "default",
    MIDNIGHT: "midnight-sapphire"
};

const APP_STATE = {
    observer: null,
    storageListenerBound: false,
    formPlaceholder: null,
    movedAuthNode: null,
    hiddenSignUp: null,
    contextInvalidated: false
};

const AUTH_ROUTE_MATCHERS = {
    login: /\/nl\/login\//,
    lostpassword: /\/nl\/lostpassword\//,
    register: /\/nl\/register\//,
    pelckmansLogin: /\/aanmelden(?:\/|$)/
};

function isPelckmansPortalHost(hostname) {
    return hostname === "pelckmansportaal.be"
        || hostname === "www.pelckmansportaal.be"
        || hostname.endsWith(".pelckmansportaal.be");
}

function getAuthPageType() {
    const host = window.location.hostname;
    const isIdHost = host === "id.pelckmans.be";
    const isPelckmansHost = isPelckmansPortalHost(host);
    if (!isIdHost && !isPelckmansHost) {
        return null;
    }

    const path = window.location.pathname;
    if (isPelckmansHost && AUTH_ROUTE_MATCHERS.pelckmansLogin.test(path)) {
        return "login";
    }
    if (AUTH_ROUTE_MATCHERS.login.test(path)) {
        return "login";
    }
    if (AUTH_ROUTE_MATCHERS.lostpassword.test(path)) {
        return "lostpassword";
    }
    if (AUTH_ROUTE_MATCHERS.register.test(path)) {
        return "register";
    }
    return null;
}

function isAuthPage() {
    return !!getAuthPageType();
}

function isPelckmansAanmeldenPage() {
    const host = window.location.hostname;
    const path = window.location.pathname;
    const isPelckmansHost = isPelckmansPortalHost(host);
    return isPelckmansHost && AUTH_ROUTE_MATCHERS.pelckmansLogin.test(path);
}

function isDigiboekPage() {
    return window.location.hostname === "digiboek.pelckmansportaal.be";
}

function isContextInvalidatedError(error) {
    return !!(error && typeof error.message === "string" && error.message.includes("Extension context invalidated"));
}

function markContextInvalidated() {
    APP_STATE.contextInvalidated = true;
    if (APP_STATE.observer) {
        APP_STATE.observer.disconnect();
        APP_STATE.observer = null;
    }
}

function canUseChromeApi() {
    if (APP_STATE.contextInvalidated) {
        return false;
    }

    try {
        return !!(chrome && chrome.runtime && chrome.storage && chrome.storage.sync);
    } catch (error) {
        if (isContextInvalidatedError(error)) {
            markContextInvalidated();
        }
        return false;
    }
}

function injectSettingsButton() {
    if (document.getElementById("pmppp-settings-container")) {
        return;
    }

    const container = document.createElement("div");
    container.id = "pmppp-settings-container";
    container.innerHTML = [
        "<button id=\"pmppp-settings-btn\" type=\"button\" title=\"Pelckmansportaal ++ instellingen\">P++</button>",
        "<div id=\"pmppp-settings-overlay\" class=\"hidden\">",
        "<div id=\"pmppp-settings-menu\">",
        "<div class=\"pmppp-settings-menu-header\">",
        "<p>Pelckmansportaal ++</p>",
        "<button id=\"pmppp-settings-close\" type=\"button\" aria-label=\"Sluiten\">x</button>",
        "</div>",
        "<div class=\"pmppp-settings-section\">",
        "<h3>Thema</h3>",
        "<button type=\"button\" data-theme=\"default\" class=\"pmppp-theme-option\">Standaard</button>",
        "<button type=\"button\" data-theme=\"midnight-sapphire\" class=\"pmppp-theme-option\">Midnight Sapphire</button>",
        "</div>",
        "<div class=\"pmppp-settings-section\">",
        "<label class=\"pmppp-settings-row\">",
        "<input type=\"checkbox\" id=\"pmppp-persistent-login-toggle\">",
        "<span>Blijf ingelogd (Cookies)</span>",
        "</label>",
        "<div id=\"pmppp-cookie-duration-container\" style=\"display: none; margin-top: 5px; margin-left: 20px;\">",
        "<label class=\"pmppp-settings-row\">",
        "<span>Aantal dagen: </span>",
        "<input type=\"number\" id=\"pmppp-cookie-duration-input\" min=\"1\" max=\"3650\" value=\"365\" style=\"width: 60px;\">",
        "</label>",
        "</div>",
        "</div>",
        "</div>",
        "</div>"
    ].join("");

    document.body.appendChild(container);

    const button = document.getElementById("pmppp-settings-btn");
    const overlay = document.getElementById("pmppp-settings-overlay");
    const menu = document.getElementById("pmppp-settings-menu");
    const closeButton = document.getElementById("pmppp-settings-close");

    if (!button || !menu || !overlay || !closeButton) {
        return;
    }

    button.addEventListener("click", (event) => {
        event.stopPropagation();
        overlay.classList.remove("hidden");
    });

    closeButton.addEventListener("click", () => {
        overlay.classList.add("hidden");
    });

    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
            overlay.classList.add("hidden");
        }
    });

    // Theme logic
    menu.querySelectorAll(".pmppp-theme-option").forEach((option) => {
        option.addEventListener("click", () => {
            const theme = option.getAttribute("data-theme") || THEMES.DEFAULT;
            chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: theme });
        });
    });

    // Toggles logic
    const persistentLoginToggle = document.getElementById("pmppp-persistent-login-toggle");
    const durationContainer = document.getElementById("pmppp-cookie-duration-container");
    const durationInput = document.getElementById("pmppp-cookie-duration-input");

    if (persistentLoginToggle) {
        persistentLoginToggle.addEventListener("change", (e) => {
            chrome.storage.sync.set({ [STORAGE_KEYS.PERSISTENT_LOGIN]: e.target.checked });
            if (durationContainer) {
                durationContainer.style.display = e.target.checked ? "block" : "none";
            }
        });
    }

    if (durationInput) {
        durationInput.addEventListener("change", (e) => {
            let val = parseInt(e.target.value, 10);
            if (isNaN(val) || val < 1) val = 365;
            chrome.storage.sync.set({ [STORAGE_KEYS.COOKIE_DURATION]: val });
        });
    }

    // Populate current settings visually
    chrome.storage.sync.get(
        [STORAGE_KEYS.THEME, STORAGE_KEYS.PERSISTENT_LOGIN, STORAGE_KEYS.COOKIE_DURATION],
        (settings) => {
            const currentTheme = settings[STORAGE_KEYS.THEME] || THEMES.DEFAULT;
            syncThemeMenu(currentTheme);

            const persistent = typeof settings[STORAGE_KEYS.PERSISTENT_LOGIN] === "boolean" ? settings[STORAGE_KEYS.PERSISTENT_LOGIN] : false;
            if (persistentLoginToggle) persistentLoginToggle.checked = persistent;
            if (durationContainer) durationContainer.style.display = persistent ? "block" : "none";

            const duration = typeof settings[STORAGE_KEYS.COOKIE_DURATION] === "number" ? settings[STORAGE_KEYS.COOKIE_DURATION] : 365;
            if (durationInput) durationInput.value = duration;
        }
    );

    document.addEventListener("click", (event) => {
        if (!container.contains(event.target)) {
            overlay.classList.add("hidden");
        }
    });
}

function ensureMidnightBackground(enabled) {
    const existing = document.getElementById("pmppp-background-image-container");
    if (!enabled) {
        if (existing) {
            existing.remove();
        }
        return;
    }

    if (existing) {
        return;
    }

    const backgroundLayer = document.createElement("div");
    backgroundLayer.id = "pmppp-background-image-container";

    const image = document.createElement("img");
    image.id = "pmppp-background-image";
    image.alt = "Midnight Sapphire";
    image.src = chrome.runtime.getURL("Themes/Midnight_sapphire.png");

    backgroundLayer.appendChild(image);
    document.body.prepend(backgroundLayer);
}

function getAuthTitle(pageType) {
    if (pageType === "lostpassword") {
        return "Wachtwoord herstellen";
    }
    if (pageType === "register") {
        return "Registreren";
    }
    return "PelckmansPortaal ++";
}

function findAuthForm() {
    const forms = Array.from(document.querySelectorAll("form"));
    if (!forms.length) {
        return null;
    }

    // Prefer a real auth form so /aanmelden gets the same shell as /nl/login/p.
    const scored = forms
        .map((form) => {
            let score = 0;
            if (form.querySelector('input[type="password"]')) {
                score += 4;
            }
            if (form.querySelector('input[type="email"], input[name*="mail"], input[name*="user"], input[id*="user"]')) {
                score += 2;
            }
            if (form.querySelector('button[type="submit"], input[type="submit"]')) {
                score += 2;
            }
            if (form.closest(".login-app__form, .auth-form, .registration-form")) {
                score += 2;
            }
            return { form, score };
        })
        .sort((a, b) => b.score - a.score);

    return scored[0] ? scored[0].form : null;
}

function ensureButtonStyles(form) {
    const submitButton = form.querySelector('button[type="submit"], .button[type="submit"], .smscButton.blue');
    if (submitButton) {
        submitButton.classList.add("pmppp-action-button", "pmppp-submit-button");
    }

    const forgotLinks = form.querySelectorAll('a[href*="password-recovery"], a[href*="lostpassword"], a[href*="password"]');
    forgotLinks.forEach((link) => {
        if (!link.classList.contains("pmppp-login-link")) {
            link.classList.add("pmppp-login-link");
        }
        const text = (link.textContent || "").trim();
        if (/wachtwoord\s+vergeten\?/i.test(text) && !text.startsWith("🔒")) {
            link.textContent = `🔒 ${text}`;
        }
    });
}

function ensureLoginRegisterButton(form) {
    if (document.getElementById("pmppp-register-link")) {
        return;
    }

    const registerSource = document.querySelector('a.button[href*="/register/p"], a[href*="/register/p"]');
    const registerHref = registerSource
        ? registerSource.getAttribute("href")
        : "https://id.pelckmans.be/nl/register/p";

    const registerLink = document.createElement("a");
    registerLink.id = "pmppp-register-link";
    registerLink.className = "pmppp-action-button pmppp-register-button";
    registerLink.href = registerHref || "https://id.pelckmans.be/nl/register/p";
    registerLink.textContent = "Registreer";

    const submitButton = form.querySelector(".pmppp-submit-button");
    if (submitButton) {
        submitButton.insertAdjacentElement("afterend", registerLink);
    } else {
        form.appendChild(registerLink);
    }
}

function findLandingAuthNode(pageType) {
    if (pageType !== "login" || !isPelckmansAanmeldenPage()) {
        return null;
    }

    return document.querySelector(".columns .column--left") || document.querySelector(".column--left");
}

function findSourceContainer(authNode) {
    if (authNode) {
        const scoped = authNode.closest(".login-app, .columns, main");
        if (scoped) {
            return scoped;
        }
    }

    return document.querySelector(".login-app")
        || document.querySelector(".columns")
        || document.querySelector("main")
        || null;
}

function prepareLandingAuthNode(authNode) {
    authNode.classList.add("pmppp-auth-form", "pmppp-landing-auth");

    const landingButtons = authNode.querySelectorAll(".button--login, .bc-button__button");
    landingButtons.forEach((button) => {
        button.classList.add("pmppp-action-button", "pmppp-submit-button");
    });

    const infoLinks = authNode.querySelectorAll(".info-link");
    infoLinks.forEach((link) => {
        link.classList.add("pmppp-login-link");
    });

    const infoLinksContainer = authNode.querySelector('.info-links');
    if (infoLinksContainer && !infoLinksContainer.hasAttribute('data-pmppp-initialized')) {
        infoLinksContainer.setAttribute('data-pmppp-initialized', 'true');
        infoLinksContainer.style.display = "none";
        
        const moreButton = document.createElement("button");
        moreButton.type = "button";
        moreButton.className = "pmppp-action-button pmppp-more-button";
        moreButton.textContent = "Meer";
        moreButton.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            infoLinksContainer.style.display = "block";
            moreButton.style.display = "none";
        });
        
        infoLinksContainer.parentNode.insertBefore(moreButton, infoLinksContainer);
    }
}

function findAuthMountNode(form) {
    if (!form) {
        return null;
    }

    return form.closest(".login-app__form, .auth-form, .registration-form, .panel, .card, .container") || form;
}

function buildOrUpdateAuthShell(pageType, authNode, options = {}) {
    let root = document.getElementById("pmppp-auth-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "pmppp-auth-root";
        root.innerHTML = [
            "<div class=\"pmppp-auth-card\">",
            "<h1 class=\"pmppp-auth-title\"></h1>",
            "<div class=\"pmppp-auth-form-host\"></div>",
            "</div>"
        ].join("");

        const attachTarget = document.getElementById("root") || document.body;
        attachTarget.appendChild(root);
    }

    const title = root.querySelector(".pmppp-auth-title");
    const host = root.querySelector(".pmppp-auth-form-host");
    if (!title || !host) {
        return;
    }

    title.textContent = getAuthTitle(pageType);
    title.classList.toggle("pmppp-hidden", !!options.hideShellTitle);
    if (options.replaceHostContent) {
        host.textContent = "";
    }
    if (authNode.parentElement !== host) {
        host.appendChild(authNode);
    }
}

function renderCustomAuthShell(pageType) {
    const form = findAuthForm();
    const authNode = form ? findAuthMountNode(form) : findLandingAuthNode(pageType);
    if (!authNode) {
        return;
    }

    const isLandingLoginNode = !form && pageType === "login" && isPelckmansAanmeldenPage();
    if (isLandingLoginNode) {
        document.body.classList.remove("pmppp-landing-standalone");

        const sourceContainer = findSourceContainer(authNode);
        if (sourceContainer && !APP_STATE.formPlaceholder && authNode.parentElement) {
            APP_STATE.formPlaceholder = document.createElement("div");
            APP_STATE.formPlaceholder.id = "pmppp-auth-form-placeholder";
            authNode.parentElement.insertBefore(APP_STATE.formPlaceholder, authNode);
            APP_STATE.movedAuthNode = authNode;
        }

        if (sourceContainer) {
            sourceContainer.classList.add("pmppp-source-hidden");
        }

        prepareLandingAuthNode(authNode);
        buildOrUpdateAuthShell(pageType, authNode);
        document.body.classList.add("pmppp-auth-page", "pmppp-custom-auth-active");
        return;
    }

    document.body.classList.remove("pmppp-landing-standalone");

    const sourceContainer = findSourceContainer(authNode);
    if (sourceContainer && !APP_STATE.formPlaceholder && authNode.parentElement) {
        APP_STATE.formPlaceholder = document.createElement("div");
        APP_STATE.formPlaceholder.id = "pmppp-auth-form-placeholder";
        authNode.parentElement.insertBefore(APP_STATE.formPlaceholder, authNode);
        APP_STATE.movedAuthNode = authNode;
    }

    if (sourceContainer) {
        sourceContainer.classList.add("pmppp-source-hidden");
    }

    const signUpSection = document.getElementById("sign-up");
    if (signUpSection) {
        signUpSection.style.display = "none";
        APP_STATE.hiddenSignUp = signUpSection;
    }

    if (form) {
        form.classList.add("pmppp-auth-form");
        ensureButtonStyles(form);
        if (pageType === "login") {
            ensureLoginRegisterButton(form);
        } else {
            const registerLink = document.getElementById("pmppp-register-link");
            if (registerLink) {
                registerLink.remove();
            }
        }
    } else {
        prepareLandingAuthNode(authNode);
    }

    buildOrUpdateAuthShell(pageType, authNode);
    document.body.classList.add("pmppp-auth-page", "pmppp-custom-auth-active");
    document.body.classList.add(`pmppp-auth-${pageType}`);
}

function teardownCustomAuthShell() {
    if (APP_STATE.formPlaceholder && APP_STATE.movedAuthNode) {
        APP_STATE.formPlaceholder.replaceWith(APP_STATE.movedAuthNode);
    }
    APP_STATE.formPlaceholder = null;
    APP_STATE.movedAuthNode = null;

    if (APP_STATE.hiddenSignUp) {
        APP_STATE.hiddenSignUp.style.display = "";
        APP_STATE.hiddenSignUp = null;
    }

    const shell = document.getElementById("pmppp-auth-root");

    if (shell) {
        shell.remove();
    }

    const registerLink = document.getElementById("pmppp-register-link");
    if (registerLink) {
        registerLink.remove();
    }

    document.querySelectorAll(".pmppp-source-hidden").forEach((node) => {
        node.classList.remove("pmppp-source-hidden");
    });

    // Revert info links display
    document.querySelectorAll('.pmppp-more-button').forEach(btn => btn.remove());
    document.querySelectorAll('.info-links[data-pmppp-initialized]').forEach(container => {
        container.removeAttribute('data-pmppp-initialized');
        container.style.display = "";
    });

    // Revert padlock emoji from login links
    document.querySelectorAll('.pmppp-login-link').forEach((link) => {
        const text = link.textContent || "";
        if (text.startsWith("🔒 ")) {
            link.textContent = text.substring(2);
        }
    });

    // Completely revert classes added to native elements
    document.querySelectorAll(".pmppp-auth-form, .pmppp-landing-auth, .pmppp-action-button, .pmppp-submit-button, .pmppp-login-link, .pmppp-register-button").forEach((node) => {
        node.classList.remove(
            "pmppp-auth-form",
            "pmppp-landing-auth",
            "pmppp-action-button",
            "pmppp-submit-button",
            "pmppp-login-link",
            "pmppp-register-button"
        );
    });

    document.body.classList.remove("pmppp-landing-standalone");
}

function applyAuthStructure() {
    const pageType = getAuthPageType();
    const previousClasses = ["pmppp-auth-login", "pmppp-auth-lostpassword", "pmppp-auth-register"];
    document.body.classList.remove(...previousClasses);

    if (!pageType) {
        document.body.classList.remove("pmppp-auth-page", "pmppp-custom-auth-active", "pmppp-login-page", "pmppp-compact-login");
        teardownCustomAuthShell();
        return;
    }

    document.body.classList.add("pmppp-login-page");
    document.body.classList.add("pmppp-compact-login");

    renderCustomAuthShell(pageType);
}

function applyState(theme) {
    document.body.classList.remove("pmppp-theme-midnight-sapphire");
    document.body.classList.toggle("pmppp-theme-midnight-sapphire", theme === THEMES.MIDNIGHT);

    ensureMidnightBackground(theme === THEMES.MIDNIGHT && !isDigiboekPage());

    if (theme === THEMES.MIDNIGHT) {
        applyAuthStructure();
    } else {
        const previousClasses = ["pmppp-auth-login", "pmppp-auth-lostpassword", "pmppp-auth-register"];
        document.body.classList.remove(...previousClasses, "pmppp-auth-page", "pmppp-custom-auth-active", "pmppp-login-page", "pmppp-compact-login");
        teardownCustomAuthShell();
    }

    syncThemeMenu(theme);
}

function syncThemeMenu(theme) {
    const options = document.querySelectorAll(".pmppp-theme-option");
    options.forEach((option) => {
        const selected = option.getAttribute("data-theme") === theme;
        option.classList.toggle("is-selected", selected);
    });
}

function applyStateFromStorage() {
    if (!canUseChromeApi()) {
        applyState(THEMES.MIDNIGHT);
        return;
    }

    try {
        chrome.storage.sync.get([STORAGE_KEYS.THEME, STORAGE_KEYS.PERSISTENT_LOGIN, STORAGE_KEYS.COOKIE_DURATION], (settings) => {
            if (APP_STATE.contextInvalidated) {
                return;
            }

            const safeSettings = settings && typeof settings === "object" ? settings : {};
            const theme = safeSettings[STORAGE_KEYS.THEME] || THEMES.MIDNIGHT;
            applyState(theme);

            // Keep the injected menu UI in sync if the popup changes it or logic changes it
            syncMenuUI(safeSettings);
        });
    } catch (error) {
        if (isContextInvalidatedError(error)) {
            markContextInvalidated();
            return;
        }
        applyState(THEMES.MIDNIGHT);
    }
}

function syncMenuUI(settings) {
    const persistentToggle = document.getElementById("pmppp-persistent-login-toggle");
    const durationContainer = document.getElementById("pmppp-cookie-duration-container");
    const durationInput = document.getElementById("pmppp-cookie-duration-input");
    
    if (persistentToggle && typeof settings[STORAGE_KEYS.PERSISTENT_LOGIN] === "boolean") {
        persistentToggle.checked = settings[STORAGE_KEYS.PERSISTENT_LOGIN];
        if (durationContainer) {
            durationContainer.style.display = settings[STORAGE_KEYS.PERSISTENT_LOGIN] ? "block" : "none";
        }
    }
    
    if (durationInput && typeof settings[STORAGE_KEYS.COOKIE_DURATION] === "number") {
        durationInput.value = settings[STORAGE_KEYS.COOKIE_DURATION];
    }
}

function mountDomObserver() {
    if (APP_STATE.observer) {
        return;
    }

    APP_STATE.observer = new MutationObserver(() => {
        applyStateFromStorage();
    });
    APP_STATE.observer.observe(document.body, { childList: true, subtree: true });
}

function init() {
    if (APP_STATE.contextInvalidated) {
        return;
    }

    injectSettingsButton();
    applyStateFromStorage();
    mountDomObserver();

    if (!APP_STATE.storageListenerBound) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== "sync") {
                return;
            }
            if (changes[STORAGE_KEYS.THEME] || changes[STORAGE_KEYS.PERSISTENT_LOGIN] || changes[STORAGE_KEYS.COOKIE_DURATION]) {
                applyStateFromStorage();
            }
        });
        APP_STATE.storageListenerBound = true;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}
