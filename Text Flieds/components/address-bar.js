/* Address Bar — Seznam Aplikace UI Kit. Reuse AddressBar.render / mount / hydrate. */
(function (global) {
  const VARIANTS = [
    { id: "prihlasen-d", label: "Prihlasen D" },
    { id: "prihlasen-s", label: "Avatar" },
    { id: "neprihlasen", label: "Neprihlasen" },
    { id: "zadejte", label: "Zadejte" },
    { id: "zadejte-2", label: "Zadejte 2" },
    { id: "autofill", label: "Autofill" },
    { id: "fill", label: "Fill" },
    { id: "select", label: "Select" },
    { id: "edit", label: "Edit" },
    { id: "url", label: "URL" },
    { id: "warning", label: "URL Vykřičník" },
    { id: "slovnik", label: "URL Slovník" },
    { id: "both", label: "URL Slovník & Vykřičník" },
  ];

  const SMALL_VARIANTS = ["url", "warning", "slovnik", "both"];

  const ICO_REFRESH = `<svg class="addr-ico addr-refresh" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20C9.76667 20 7.875 19.225 6.325 17.675C4.775 16.125 4 14.2333 4 12C4 9.76667 4.775 7.875 6.325 6.325C7.875 4.775 9.76667 4 12 4C13.15 4 14.25 4.23767 15.3 4.713C16.35 5.18767 17.25 5.86667 18 6.75V5C18 4.71667 18.096 4.479 18.288 4.287C18.4793 4.09567 18.7167 4 19 4C19.2833 4 19.5207 4.09567 19.712 4.287C19.904 4.479 20 4.71667 20 5V10C20 10.2833 19.904 10.5207 19.712 10.712C19.5207 10.904 19.2833 11 19 11H14C13.7167 11 13.4793 10.904 13.288 10.712C13.096 10.5207 13 10.2833 13 10C13 9.71667 13.096 9.479 13.288 9.287C13.4793 9.09567 13.7167 9 14 9H17.2C16.6667 8.06667 15.9377 7.33333 15.013 6.8C14.0877 6.26667 13.0833 6 12 6C10.3333 6 8.91667 6.58333 7.75 7.75C6.58333 8.91667 6 10.3333 6 12C6 13.6667 6.58333 15.0833 7.75 16.25C8.91667 17.4167 10.3333 18 12 18C13.15 18 14.2127 17.6957 15.188 17.087C16.1627 16.479 16.8917 15.6667 17.375 14.65C17.4583 14.4667 17.596 14.3127 17.788 14.188C17.9793 14.0627 18.175 14 18.375 14C18.7583 14 19.046 14.1333 19.238 14.4C19.4293 14.6667 19.45 14.9667 19.3 15.3C18.6667 16.7167 17.6917 17.854 16.375 18.712C15.0583 19.5707 13.6 20 12 20Z" fill="currentColor"/></svg>`;
  const ICO_SEARCH = `<svg class="addr-ico addr-search" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18.9 20.3L13.3 14.7C12.8 15.1 12.225 15.4167 11.575 15.65C10.925 15.8833 10.2333 16 9.5 16C7.68333 16 6.146 15.371 4.888 14.113C3.62933 12.8543 3 11.3167 3 9.5C3 7.68333 3.62933 6.14567 4.888 4.887C6.146 3.629 7.68333 3 9.5 3C11.3167 3 12.8543 3.629 14.113 4.887C15.371 6.14567 16 7.68333 16 9.5C16 10.2333 15.8833 10.925 15.65 11.575C15.4167 12.225 15.1 12.8 14.7 13.3L20.325 18.925C20.5083 19.1083 20.6 19.3333 20.6 19.6C20.6 19.8667 20.5 20.1 20.3 20.3C20.1167 20.4833 19.8833 20.575 19.6 20.575C19.3167 20.575 19.0833 20.4833 18.9 20.3ZM9.5 14C10.75 14 11.8127 13.5627 12.688 12.688C13.5627 11.8127 14 10.75 14 9.5C14 8.25 13.5627 7.18733 12.688 6.312C11.8127 5.43733 10.75 5 9.5 5C8.25 5 7.18733 5.43733 6.312 6.312C5.43733 7.18733 5 8.25 5 9.5C5 10.75 5.43733 11.8127 6.312 12.688C7.18733 13.5627 8.25 14 9.5 14Z" fill="currentColor"/></svg>`;
  const ICO_BACK = `<svg class="addr-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.875 19.3L4.275 12.7C4.175 12.6 4.104 12.4917 4.062 12.375C4.02067 12.2583 4 12.1333 4 12C4 11.8667 4.02067 11.7417 4.062 11.625C4.104 11.5083 4.175 11.4 4.275 11.3L10.875 4.7C11.0583 4.51667 11.2873 4.42067 11.562 4.412C11.8373 4.404 12.075 4.5 12.275 4.7C12.475 4.88333 12.5793 5.11233 12.588 5.387C12.596 5.66233 12.5 5.9 12.3 6.1L7.4 11H18.575C18.8583 11 19.096 11.0957 19.288 11.287C19.4793 11.479 19.575 11.7167 19.575 12C19.575 12.2833 19.4793 12.5207 19.288 12.712C19.096 12.904 18.8583 13 18.575 13H7.4L12.3 17.9C12.4833 18.0833 12.5793 18.3167 12.588 18.6C12.596 18.8833 12.5 19.1167 12.3 19.3C12.1167 19.5 11.8833 19.6 11.6 19.6C11.3167 19.6 11.075 19.5 10.875 19.3Z" fill="currentColor"/></svg>`;
  const ICO_CLOSE = `<svg class="addr-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.4 18.308L5.692 17.6L11.292 12L5.692 6.4L6.4 5.692L12 11.292L17.6 5.692L18.308 6.4L12.708 12L18.308 17.6L17.6 18.308L12 12.708L6.4 18.308Z" fill="currentColor"/></svg>`;
  const ICO_PERSON = `<svg class="addr-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 12C10.9 12 9.95833 11.6083 9.175 10.825C8.39167 10.0417 8 9.1 8 8C8 6.9 8.39167 5.95833 9.175 5.175C9.95833 4.39167 10.9 4 12 4C13.1 4 14.0417 4.39167 14.825 5.175C15.6083 5.95833 16 6.9 16 8C16 9.1 15.6083 10.0417 14.825 10.825C14.0417 11.6083 13.1 12 12 12ZM6 20C5.45 20 4.97933 19.8043 4.588 19.413C4.196 19.021 4 18.55 4 18V17.2C4 16.6333 4.146 16.1123 4.438 15.637C4.72933 15.1623 5.11667 14.8 5.6 14.55C6.63333 14.0333 7.68333 13.6457 8.75 13.387C9.81667 13.129 10.9 13 12 13C13.1 13 14.1833 13.129 15.25 13.387C16.3167 13.6457 17.3667 14.0333 18.4 14.55C18.8833 14.8 19.2707 15.1623 19.562 15.637C19.854 16.1123 20 16.6333 20 17.2V18C20 18.55 19.8043 19.021 19.413 19.413C19.021 19.8043 18.55 20 18 20H6Z" fill="currentColor"/></svg>`;

  function asset(opts, name) {
    const base = (opts && opts.assetBase) || "assets";
    return base.replace(/\/$/, "") + "/" + name;
  }

  function render(opts) {
    opts = opts || {};
    const variant = opts.variant || opts.type || "url";
    const small = opts.size === "small" && SMALL_VARIANTS.indexOf(variant) !== -1;
    const pressed = !!opts.pressed;
    const host = opts.host || "novinky.cz";
    const value = opts.value || "naovo";
    const placeholder = opts.placeholder || "Zadejte dotaz nebo adresu";
    const dot = opts.dot ? `<span class="type-dot">${opts.dot}</span>` : "";
    const tab = opts.live ? "0" : "-1";
    const avatar = `<img class="addr-avatar" src="${asset(opts, "avatar.png")}" width="40" height="40" alt="" />`;
    const account = `<span class="addr-account">${ICO_PERSON}</span>`;
    const logo = `<img class="addr-logo" src="${asset(opts, "seznam.svg")}" width="156" height="40" alt="Seznam.cz" />`;
    const first = host.slice(0, 1);
    const rest = host.slice(1);

    if (variant === "prihlasen-d") {
      return `<div class="addr-bar"><div class="addr-row"><span class="addr-ghost"></span>${logo}${avatar}</div></div>${dot}`;
    }
    const pill = (cls, inner) =>
      `<div class="addr-bar${small ? " is-small" : ""}"><button type="button" class="addr ${cls}${pressed ? " is-pressed" : ""}" tabindex="${tab}">${inner}</button></div>${dot}`;
    if (variant === "prihlasen-s") {
      return `<div class="addr-bar"><div class="addr-row"><button type="button" class="addr is-zadejte${pressed ? " is-pressed" : ""}" tabindex="${tab}">${ICO_SEARCH}<span class="addr-url">${placeholder}</span></button>${avatar}</div></div>${dot}`;
    }
    if (variant === "neprihlasen") {
      return `<div class="addr-bar"><div class="addr-row"><button type="button" class="addr is-zadejte${pressed ? " is-pressed" : ""}" tabindex="${tab}">${ICO_SEARCH}<span class="addr-url">${placeholder}</span></button>${account}</div></div>${dot}`;
    }
    if (variant === "zadejte") {
      return pill("is-zadejte", `${ICO_SEARCH}<span class="addr-url">${placeholder}</span>`);
    }
    if (variant === "zadejte-2") {
      return pill("is-edit is-zadejte", `${ICO_BACK}<span class="addr-text"><span class="addr-cursor"></span><span class="addr-url">${placeholder}</span></span>`);
    }
    if (variant === "autofill") {
      return pill("is-edit", `${ICO_BACK}<span class="addr-text"><span>${first}</span><span class="addr-cursor"></span><span class="addr-sel">${rest}</span></span>${ICO_CLOSE}`);
    }
    if (variant === "fill") {
      return pill("is-edit", `${ICO_BACK}<span class="addr-text"><span>${value}</span><span class="addr-cursor"></span></span>${ICO_CLOSE}`);
    }
    if (variant === "select") {
      return pill("is-edit", `${ICO_BACK}<span class="addr-text"><span class="addr-sel">${host}</span></span>${ICO_CLOSE}`);
    }
    if (variant === "edit") {
      const knob = `<img src="${asset(opts, "addr-handle.svg")}" alt="" />`;
      return pill("is-edit", `${ICO_BACK}<span class="addr-text"><span class="addr-handle is-start" aria-hidden="true">${knob}</span><span class="addr-sel">${host}</span><span class="addr-handle is-end" aria-hidden="true">${knob}</span></span>${ICO_CLOSE}`);
    }
    const warning = variant === "warning" || variant === "both" || !!opts.warning;
    const translate = variant === "slovnik" || variant === "both" || !!opts.translate;
    const warnIco = warning
      ? `<span class="addr-ico addr-warn"><img src="${asset(opts, "addr-warning.svg")}" alt="" /></span>`
      : "";
    const flag = translate
      ? `<span class="addr-flag"><img src="${asset(opts, "flag-gb.svg")}" alt="" /></span>`
      : "";
    const urlCls = `is-url${warning ? " is-warn" : ""}`;
    const urlInner = `${warnIco}<span class="addr-url">${host}</span>${ICO_REFRESH}`;
    if (translate) {
      return `<div class="addr-bar${small ? " is-small" : ""} is-translate"><div class="addr-row"><button type="button" class="addr ${urlCls}${pressed ? " is-pressed" : ""}" tabindex="${tab}">${urlInner}</button>${flag}</div></div>${dot}`;
    }
    return pill(urlCls, urlInner);
  }

  function nodeFromHtml(html) {
    const wrap = document.createElement("div");
    wrap.innerHTML = html.trim();
    return wrap.firstElementChild;
  }

  function mount(target, opts) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    const next = nodeFromHtml(render(opts));
    if (!next) return null;
    if (el.id) next.id = el.id;
    if (el.hasAttribute("data-address-bar") || el.classList.contains("addr-bar")) {
      el.replaceWith(next);
      return next;
    }
    el.innerHTML = "";
    el.appendChild(next);
    return next;
  }

  function optsFromEl(el) {
    return {
      variant: el.dataset.variant || el.dataset.type || "url",
      size: el.dataset.size || "default",
      host: el.dataset.host,
      value: el.dataset.value,
      placeholder: el.dataset.placeholder,
      assetBase: el.dataset.assetBase,
      live: el.hasAttribute("data-live"),
      pressed: el.hasAttribute("data-pressed"),
      warning: el.hasAttribute("data-warning"),
      translate: el.hasAttribute("data-translate"),
    };
  }

  function hydrate(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-address-bar]").forEach((el) => {
      mount(el, optsFromEl(el));
    });
  }

  function setSmall(target, small) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    const bar = el.classList.contains("addr-bar") ? el : el.querySelector(".addr-bar");
    if (!bar) return null;
    bar.classList.toggle("is-small", !!small);
    bar.dataset.size = small ? "small" : "default";
    return bar;
  }

  global.AddressBar = {
    VARIANTS: VARIANTS,
    SMALL_VARIANTS: SMALL_VARIANTS,
    render: render,
    mount: mount,
    hydrate: hydrate,
    setSmall: setSmall,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { hydrate(); });
  } else {
    hydrate();
  }
})(window);
