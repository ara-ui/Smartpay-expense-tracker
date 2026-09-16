document.addEventListener("DOMContentLoaded", async () => {

    const headerContainer =
        document.getElementById("userHeaderContainer");

    if (!headerContainer) {
        return;
    }

    try {

        const response =
            await fetch("components/userHeader.html");

        if (!response.ok) {
            throw new Error("Failed to load user header");
        }

        const headerHTML = await response.text();

        headerContainer.innerHTML = headerHTML;


        const token = localStorage.getItem("token");

        if (!token) {
            return;
        }

        let user = null;

        try {

            if (typeof jwt_decode === "function") {
                user = jwt_decode(token);
            }

        } catch (error) {

            console.error(
                "Unable to decode token:",
                error
            );

        }


        const userName =
            user?.name ||
            user?.username ||
            "User";

        const userEmail =
            user?.email ||
            "user@email.com";


        const initial =
            userName.charAt(0).toUpperCase();


        const nameElement =
            document.getElementById("dropdownUserName");

        const emailElement =
            document.getElementById("dropdownUserEmail");

        const avatarInitial =
            document.getElementById("userAvatarInitial");

        const avatarLarge =
            document.getElementById("userAvatarLarge");


        if (nameElement) {
            nameElement.textContent = userName;
        }

        if (emailElement) {
            emailElement.textContent = userEmail;
        }

        if (avatarInitial) {
            avatarInitial.textContent = initial;
        }

        if (avatarLarge) {
            avatarLarge.textContent = initial;
        }

        const badge =
            document.getElementById("dropdownUserBadge");

        const premium =
            user?.isPremiumUser === true ||
            user?.isPremiumUser === "true";

        if (badge) {

            if (premium) {

                badge.textContent = "Premium User";

                badge.classList.remove("badge-free");
                badge.classList.add("badge-premium");

            } else {

                badge.textContent = "Free User";

                badge.classList.remove("badge-premium");
                badge.classList.add("badge-free");

            }

        }


        const accountArea =
            document.getElementById("accountArea");

        const dropdown =
            document.getElementById("userDropdown");

    


        if (accountArea && dropdown) {

            accountArea.addEventListener(
                "click",
                function (event) {

                    event.stopPropagation();

                    dropdown.classList.toggle("open");

                }
            );

        }


        document.addEventListener(
            "click",
            function () {

                if (dropdown) {
                    dropdown.classList.remove("open");
                }

            }
        );


        const logoutLink =
            document.getElementById("logoutLink");

        if (logoutLink) {

            logoutLink.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    localStorage.removeItem("token");

                    window.location.href =
                        "login.html";

                }
            );

        }


        const currentPage =
            window.location.pathname
                .split("/")
                .pop()
                .replace(".html", "");

        const paymentNavLink = document.getElementById("paymentNavLink");
        if (paymentNavLink) {
            paymentNavLink.href = premium
                ? "payments.html"
                : "premium-required.html?return=payments.html";
            paymentNavLink.title = premium ? "Payments" : "Payments (Premium)";
        }

        const navLinks =
            document.querySelectorAll(
                ".nav-link"
            );

        navLinks.forEach(link => {
            if (link.classList.contains("premium-gated-nav")) {
                const lock = link.querySelector(".nav-lock");

                if (premium) {
                    // Premium users have full access, so remove the visual lock.
                    if (lock) {
                        lock.remove();
                    }
                } else {
                    const target = link.dataset.premiumPage || "expense.html";
                    link.href = `premium-required.html?return=${encodeURIComponent(target)}`;
                }
            }

            const page =
                link.dataset.page;

            if (page === currentPage) {

                link.classList.add("active");

            }

        });

    } catch (error) {

        console.error(
            "Error loading user header:",
            error
        );

    }

});