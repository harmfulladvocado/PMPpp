const DEFAULT_SETTINGS = {
    theme: "midnight-sapphire",
    persistentLogin: false,
    cookieDuration: 365
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(["theme", "persistentLogin", "cookieDuration"], (current) => {
        const next = {
            theme: current.theme || DEFAULT_SETTINGS.theme,
            persistentLogin: typeof current.persistentLogin === "boolean"
                ? current.persistentLogin
                : DEFAULT_SETTINGS.persistentLogin,
            cookieDuration: typeof current.cookieDuration === "number"
                ? current.cookieDuration
                : DEFAULT_SETTINGS.cookieDuration
        };
        chrome.storage.sync.set(next);
    });

    // Create a recurring alarm to keep the session alive
    chrome.alarms.create("keepAlive", { periodInMinutes: 10 });
});

chrome.runtime.onStartup.addListener(() => {
    chrome.alarms.create("keepAlive", { periodInMinutes: 10 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "keepAlive") {
        fetch("https://id.pelckmans.be/")
            .then(res => console.log("Keep-alive ping sent", res.status))
            .catch(err => console.error("Keep-alive error", err));

        fetch("https://pelckmansportaal.be/")
            .then(res => console.log("Keep-alive ping sent portaal", res.status))
            .catch(err => console.error("Keep-alive error portaal", err));
    }
});

chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.removed || !changeInfo.cookie) return;

    chrome.storage.sync.get(["persistentLogin", "cookieDuration"], (settings) => {
        const persistent = typeof settings.persistentLogin === "boolean" 
            ? settings.persistentLogin 
            : DEFAULT_SETTINGS.persistentLogin;
            
        if (!persistent) return;

        const durationInDays = typeof settings.cookieDuration === "number"
            ? settings.cookieDuration
            : DEFAULT_SETTINGS.cookieDuration;

        const cookie = changeInfo.cookie;
        
        // Only target target domains
        if (cookie.domain.includes("pelckmans.be") || cookie.domain.includes("pelckmansportaal.be")) {
            const targetExpiration = (Date.now() / 1000) + (durationInDays * 24 * 60 * 60);
            if (cookie.session || (cookie.expirationDate && cookie.expirationDate < targetExpiration - 3600)) {
                // Avoid extending empty cookies that the server is trying to clear
                if (cookie.value.length < 2 && ["", "deleted"].includes(cookie.value.toLowerCase())) return;
                
                const url = (cookie.secure ? "https://" : "http://") + cookie.domain.replace(/^\./, "") + cookie.path;
                chrome.cookies.set({
                    url: url,
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite,
                    storeId: cookie.storeId,
                    expirationDate: targetExpiration
                });
            }
        }
    });
});
