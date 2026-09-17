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

                    const openNotifications = document.getElementById("notificationDropdown");
                    if (openNotifications) openNotifications.hidden = true;

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


        // ---- Notifications ----

        const notificationBtn = document.getElementById("notificationBtn");
        const notificationBadge = document.getElementById("notificationBadge");
        const notificationDropdown = document.getElementById("notificationDropdown");
        const notificationList = document.getElementById("notificationList");
        const notificationMarkAll = document.getElementById("notificationMarkAll");

        const NOTIFICATION_ICONS = {
            MONEY_RECEIVED: "💰",
            MONEY_SENT: "💸",
            BUDGET_ALERT: "⚠️",
            BUDGET_EXCEEDED: "⛔"
        };

        const notificationDestination = (notification) => {
            if (notification.type === "MONEY_RECEIVED" || notification.type === "MONEY_SENT") {
                return "payments.html";
            }
            if (notification.type === "BUDGET_ALERT" || notification.type === "BUDGET_EXCEEDED") {
                return "budget.html";
            }
            return null;
        };

        const relativeTime = (isoDate) => {
            const diffMs = Date.now() - new Date(isoDate).getTime();
            const minutes = Math.round(diffMs / 60000);
            if (minutes < 1) return "Just now";
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.round(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.round(hours / 24);
            if (days < 7) return `${days}d ago`;
            return new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        };

        const escapeText = (value) => String(value ?? "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const setUnreadBadge = (count) => {
            if (!notificationBadge) return;
            if (count > 0) {
                notificationBadge.textContent = count > 9 ? "9+" : String(count);
                notificationBadge.hidden = false;
            } else {
                notificationBadge.hidden = true;
            }
        };

        const renderNotifications = (notifications) => {
            if (!notificationList) return;

            if (!notifications.length) {
                notificationList.innerHTML = '<div class="notification-empty">No new notifications</div>';
                return;
            }

            notificationList.innerHTML = notifications.map((notification) => `
                <button type="button" class="notification-item${notification.isRead ? "" : " is-unread"}" data-id="${notification._id}">
                    <span class="notification-icon">${NOTIFICATION_ICONS[notification.type] || "🔔"}</span>
                    <span class="notification-body">
                        <span class="notification-title">${escapeText(notification.title)}</span>
                        <span class="notification-text">${escapeText(notification.message)}</span>
                        <span class="notification-time">${relativeTime(notification.createdAt)}</span>
                    </span>
                    ${notification.isRead ? "" : '<span class="notification-dot" aria-hidden="true"></span>'}
                </button>
            `).join("");

            notificationList.querySelectorAll(".notification-item").forEach((item) => {
                item.addEventListener("click", async () => {
                    const notification = notifications.find((n) => n._id === item.dataset.id);
                    if (!notification) return;

                    if (!notification.isRead) {
                        try {
                            const result = await api.patch(`/notifications/${notification._id}/read`);
                            setUnreadBadge(result.data.unreadCount);
                        } catch (err) {
                            console.error("Unable to mark notification as read:", err);
                        }
                    }

                    const destination = notificationDestination(notification);
                    if (destination) window.location.href = destination;
                });
            });
        };

        const loadNotifications = async () => {
            if (!notificationList) return;
            try {
                const response = await api.get("/notifications?limit=20");
                renderNotifications(response.data.notifications || []);
                setUnreadBadge(response.data.unreadCount || 0);
            } catch (err) {
                notificationList.innerHTML = '<div class="notification-empty">Couldn\'t load notifications.</div>';
            }
        };

        if (notificationBtn && notificationDropdown) {

            loadNotifications();

            notificationBtn.addEventListener("click", (event) => {
                event.stopPropagation();
                const isOpen = !notificationDropdown.hidden;
                notificationDropdown.hidden = isOpen;
                notificationBtn.setAttribute("aria-expanded", String(!isOpen));
                if (dropdown) dropdown.classList.remove("open");
                if (!isOpen) loadNotifications();
            });

            notificationDropdown.addEventListener("click", (event) => event.stopPropagation());

            if (notificationMarkAll) {
                notificationMarkAll.addEventListener("click", async () => {
                    try {
                        await api.patch("/notifications/read-all");
                        await loadNotifications();
                    } catch (err) {
                        console.error("Unable to mark all notifications as read:", err);
                    }
                });
            }

            document.addEventListener("click", () => {
                notificationDropdown.hidden = true;
                notificationBtn.setAttribute("aria-expanded", "false");
            });

            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    notificationDropdown.hidden = true;
                    notificationBtn.setAttribute("aria-expanded", "false");
                }
            });
        }

    } catch (error) {

        console.error(
            "Error loading user header:",
            error
        );

    }

});