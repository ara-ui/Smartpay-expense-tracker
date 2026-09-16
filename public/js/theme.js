(function () {

    const savedTheme =
        localStorage.getItem("theme") || "light";

    applyGlobalTheme(savedTheme);

    function applyGlobalTheme(theme) {

        if (theme === "dark") {

            document.documentElement.classList.add("dark-theme");

        } else if (theme === "light") {

            document.documentElement.classList.remove("dark-theme");

        } else {

            const prefersDark =
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches;

            document.documentElement.classList.toggle(
                "dark-theme",
                prefersDark
            );
        }
    }

})();
