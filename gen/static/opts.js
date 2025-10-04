function getStoredSetting(name) {
  const stored_setting = localStorage.getItem(name);
  if (stored_setting !== null) {
    try {
      return JSON.parse(stored_setting);
    } catch {
      return null;
    }
  } else {
    return null;
  }
}
function hookUpOnOff(on, off, toggle) {
  on.addEventListener("click", () => {
    on.classList.add("selected");
    off.classList.remove("selected");
    toggle(true);
  });
  off.addEventListener("click", () => {
    off.classList.add("selected");
    on.classList.remove("selected");
    toggle(false);
  });
}
function darkThemeSetup() {
  let setting = getStoredSetting("dark-theme") ?? false;
  function setDarkTheme(newSetting) {
    setting = newSetting;
    localStorage.setItem("dark-theme", JSON.stringify(setting));
    document.documentElement.classList.toggle("dark", setting);
    document.documentElement.style.setProperty("color-scheme", setting ? "dark only" : "light only");
  }
  setDarkTheme(setting);
  return [setting, setDarkTheme];
}
function printEffectSetup() {
  let setting = getStoredSetting("print-effect") ?? true;
  function setPrintEffect(newSetting) {
    setting = newSetting;
    localStorage.setItem("print-effect", JSON.stringify(setting));
    document.documentElement.classList.toggle("filter", setting);
  }
  setPrintEffect(setting);
  return [setting, setPrintEffect];
}
function optionsMenu() {
  const menu = document.createElement("div");
  menu.classList.add("menu");
  menu.tabIndex = 0;
  {
    const head = document.createElement("span");
    head.classList.add("head");
    head.textContent = "config";
    menu.append(head);
  }
  {
    const body = document.createElement("div");
    body.classList.add("body");
    {
      const [initialSetting, toggle] = darkThemeSetup();

      const group = document.createElement("div");
      group.classList.add("option-group");
      {
        const label = document.createElement("span");
        label.textContent = "dark mode: ";
        group.append(label);
      }
      const on = document.createElement("button");
      on.textContent = "on";
      on.classList.toggle("selected", initialSetting);
      group.append(on);
      const off = document.createElement("button");
      off.textContent = "off";
      off.classList.toggle("selected", !initialSetting);
      group.append(off);

      hookUpOnOff(on, off, toggle);
      body.append(group);
    }
    {
      const [initialSetting, toggle] = printEffectSetup();

      const group = document.createElement("div");
      group.classList.add("option-group");
      {
        const label = document.createElement("span");
        label.textContent = "print effect: ";
        group.append(label);
      }
      const on = document.createElement("button");
      on.textContent = "on";
      on.classList.toggle("selected", initialSetting);
      group.append(on);
      const off = document.createElement("button");
      off.textContent = "off";
      off.classList.toggle("selected", !initialSetting);
      group.append(off);

      hookUpOnOff(on, off, toggle);
      body.append(group);
    }
    menu.append(body);
  }
  return menu;
}
document.querySelector("footer").append(optionsMenu());
