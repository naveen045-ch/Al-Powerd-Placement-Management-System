import { useCallback, useEffect, useState } from "react";
import api from "../api";
import "./NotificationCenter.css";

const PAGE_SIZE = 10;

function getApiError(error, fallback) {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return (
    data?.message ||
    data?.error ||
    error?.message ||
    fallback
  );
}

function getNotificationList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  for (const key of [
    "content",
    "notifications",
    "items",
    "results",
    "data",
  ]) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  return [];
}

function getUnreadCount(data) {
  if (typeof data === "number") {
    return Math.max(0, data);
  }

  if (typeof data === "string" && data.trim() !== "") {
    const number = Number(data);

    return Number.isFinite(number)
      ? Math.max(0, number)
      : 0;
  }

  if (data && typeof data === "object") {
    const count =
      data.unreadCount ??
      data.count ??
      data.totalUnread ??
      data.unread;

    const number = Number(count);

    return Number.isFinite(number)
      ? Math.max(0, number)
      : 0;
  }

  return 0;
}

function getNotificationId(notification) {
  return (
    notification?.id ??
    notification?.notificationId ??
    notification?.notification_id ??
    null
  );
}

function getNotificationTitle(notification) {
  return (
    notification?.title ||
    notification?.subject ||
    notification?.heading ||
    "Notification"
  );
}

function getNotificationMessage(notification) {
  return (
    notification?.message ||
    notification?.description ||
    notification?.content ||
    "You have a new notification."
  );
}

function isNotificationRead(notification) {
  if (typeof notification?.isRead === "boolean") {
    return notification.isRead;
  }

  if (typeof notification?.read === "boolean") {
    return notification.read;
  }

  if (typeof notification?.readStatus === "boolean") {
    return notification.readStatus;
  }

  if (notification?.readAt !== undefined) {
    return Boolean(notification.readAt);
  }

  const status = String(
    notification?.status || ""
  ).toUpperCase();

  if (status === "READ") return true;
  if (status === "UNREAD") return false;

  return false;
}

function getNotificationDate(notification) {
  return (
    notification?.createdAt ||
    notification?.created_at ||
    notification?.timestamp ||
    notification?.date ||
    null
  );
}

function formatNotificationDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationIcon({ title }) {
  const normalized = String(title || "").toLowerCase();

  let icon = "🔔";

  if (
    normalized.includes("select") ||
    normalized.includes("congrat")
  ) {
    icon = "🎉";
  } else if (
    normalized.includes("interview") ||
    normalized.includes("schedule")
  ) {
    icon = "📅";
  } else if (
    normalized.includes("application") ||
    normalized.includes("job")
  ) {
    icon = "💼";
  } else if (
    normalized.includes("reject")
  ) {
    icon = "📄";
  }

  return (
    <span className="nc-notification-icon" aria-hidden="true">
      {icon}
    </span>
  );
}

function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Refresh the unread badge.
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await api.get(
        "/api/notifications/unread-count"
      );

      setUnreadCount(
        getUnreadCount(response.data)
      );
    } catch {
      // A count failure should not break the dashboard.
    }
  }, []);

  // Load the notification list. Supports Spring Page responses
  // and plain JSON arrays.
  const loadNotifications = useCallback(
    async (page = 0, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError("");
        setActionError("");
      }

      try {
        const [listResult] = await Promise.all([
          api.get("/api/notifications", {
            params: {
              page,
              size: PAGE_SIZE,
              sort: "createdAt,DESC",
            },
          }),
          loadUnreadCount(),
        ]);

        const data = listResult.data;
        const items = getNotificationList(data);

        setNotifications((previous) => {
          if (!append) {
            return items;
          }

          const existingIds = new Set(
            previous
              .map(getNotificationId)
              .filter((id) => id !== null)
              .map(String)
          );

          const additional = items.filter((item) => {
            const id = getNotificationId(item);

            if (id === null) return true;

            return !existingIds.has(String(id));
          });

          return [...previous, ...additional];
        });

        setCurrentPage(page);

        if (
          data &&
          typeof data === "object" &&
          !Array.isArray(data)
        ) {
          if (typeof data.last === "boolean") {
            setHasMore(!data.last);
          } else if (
            typeof data.totalPages === "number"
          ) {
            setHasMore(page + 1 < data.totalPages);
          } else {
            setHasMore(items.length === PAGE_SIZE);
          }
        } else {
          setHasMore(items.length === PAGE_SIZE);
        }

        setError("");
      } catch (requestError) {
        setError(
          getApiError(
            requestError,
            "Unable to load notifications."
          )
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [loadUnreadCount]
  );

  // Display the unread count as soon as a user logs in.
  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  function togglePanel() {
    const nextOpen = !isOpen;

    setIsOpen(nextOpen);

    if (nextOpen) {
      setActionMessage("");
      setActionError("");
      loadNotifications(0, false);
    }
  }

  // Mark a single notification as read.
  async function handleMarkRead(notification) {
    const id = getNotificationId(notification);

    if (id === null || id === undefined) {
      setActionError(
        "This notification has no ID, so it cannot be marked as read."
      );
      return;
    }

    if (isNotificationRead(notification)) {
      return;
    }

    setMarkingId(id);
    setActionError("");
    setActionMessage("");

    try {
      await api.patch(
        `/api/notifications/${id}/read`
      );

      setNotifications((previous) =>
        previous.map((item) =>
          String(getNotificationId(item)) === String(id)
            ? {
                ...item,
                isRead: true,
                read: true,
                readStatus: true,
              }
            : item
        )
      );

      setUnreadCount((previous) =>
        Math.max(0, previous - 1)
      );

      setActionMessage("Notification marked as read.");

      await loadUnreadCount();
    } catch (requestError) {
      setActionError(
        getApiError(
          requestError,
          "Unable to mark notification as read."
        )
      );
    } finally {
      setMarkingId(null);
    }
  }

  // Mark all notifications as read.
  async function handleMarkAllRead() {
    if (
      markingAll ||
      unreadCount <= 0
    ) {
      return;
    }

    setMarkingAll(true);
    setActionError("");
    setActionMessage("");

    try {
      await api.patch(
        "/api/notifications/read-all"
      );

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          isRead: true,
          read: true,
          readStatus: true,
        }))
      );

      setUnreadCount(0);
      setActionMessage("All notifications marked as read.");
      await loadUnreadCount();
    } catch (requestError) {
      setActionError(
        getApiError(
          requestError,
          "Unable to mark all notifications as read."
        )
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="nc-root">
      {isOpen && (
        <button
          type="button"
          className="nc-backdrop"
          aria-label="Close notification center"
          onClick={() => setIsOpen(false)}
        />
      )}

      <button
        type="button"
        className={`nc-bell-button ${
          isOpen ? "nc-bell-open" : ""
        }`}
        onClick={togglePanel}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={isOpen}
        aria-controls="notification-center-panel"
      >
        <span className="nc-bell-icon" aria-hidden="true">
          ♧
        </span>

        <span className="nc-bell-emoji" aria-hidden="true">
          🔔
        </span>

        {unreadCount > 0 && (
          <span className="nc-unread-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          id="notification-center-panel"
          className="nc-panel"
          aria-label="Notification center"
        >
          <header className="nc-panel-header">
            <div>
              <span className="nc-panel-eyebrow">
                PLACEMENTPRO
              </span>

              <h2>Notifications</h2>

              <p>
                {unreadCount === 0
                  ? "You're all caught up."
                  : `${unreadCount} unread ${
                      unreadCount === 1
                        ? "notification"
                        : "notifications"
                    }`}
              </p>
            </div>

            <button
              type="button"
              className="nc-close-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
            >
              ×
            </button>
          </header>

          <div className="nc-toolbar">
            <button
              type="button"
              className="nc-refresh-button"
              onClick={() => loadNotifications(0, false)}
              disabled={loading || markingAll}
            >
              ↻ Refresh
            </button>

            <button
              type="button"
              className="nc-mark-all-button"
              onClick={handleMarkAllRead}
              disabled={
                markingAll ||
                loading ||
                unreadCount === 0
              }
            >
              {markingAll
                ? "Updating…"
                : "Mark all as read"}
            </button>
          </div>

          {actionMessage && (
            <p className="nc-success-message" role="status">
              {actionMessage}
            </p>
          )}

          {actionError && (
            <p className="nc-error-message" role="alert">
              {actionError}
            </p>
          )}

          {loading ? (
            <div className="nc-state">
              <span className="nc-spinner" />
              <p>Loading your notifications…</p>
            </div>
          ) : error ? (
            <div className="nc-state nc-state-error">
              <span aria-hidden="true">!</span>
              <h3>Notifications unavailable</h3>
              <p>{error}</p>

              <button
                type="button"
                className="nc-retry-button"
                onClick={() => loadNotifications(0, false)}
              >
                Try again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="nc-state">
              <span className="nc-empty-icon" aria-hidden="true">
                🔔
              </span>

              <h3>No notifications yet</h3>

              <p>
                New application updates, interview changes
                and placement alerts will appear here.
              </p>
            </div>
          ) : (
            <div className="nc-list">
              {notifications.map((notification, index) => {
                const id = getNotificationId(notification);
                const title = getNotificationTitle(notification);
                const message =
                  getNotificationMessage(notification);
                const read = isNotificationRead(notification);
                const date =
                  getNotificationDate(notification);

                return (
                  <article
                    className={`nc-item ${
                      read ? "nc-item-read" : "nc-item-unread"
                    }`}
                    key={id ?? `${title}-${index}`}
                  >
                    <NotificationIcon title={title} />

                    <div className="nc-item-content">
                      <div className="nc-item-heading">
                        <h3>{title}</h3>

                        {!read && (
                          <span
                            className="nc-unread-dot"
                            aria-label="Unread"
                            title="Unread"
                          />
                        )}
                      </div>

                      <p className="nc-item-message">
                        {message}
                      </p>

                      <time className="nc-item-date">
                        {formatNotificationDate(date)}
                      </time>

                      {!read && id !== null && (
                        <button
                          type="button"
                          className="nc-mark-read-button"
                          disabled={markingId === id}
                          onClick={() =>
                            handleMarkRead(notification)
                          }
                        >
                          {markingId === id
                            ? "Updating…"
                            : "Mark as read"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

              {hasMore && (
                <button
                  type="button"
                  className="nc-load-more"
                  disabled={loadingMore}
                  onClick={() =>
                    loadNotifications(currentPage + 1, true)
                  }
                >
                  {loadingMore
                    ? "Loading…"
                    : "Load more notifications"}
                </button>
              )}
            </div>
          )}

          <footer className="nc-panel-footer">
            Notifications are associated with your logged-in account.
          </footer>
        </section>
      )}
    </div>
  );
}

export default NotificationCenter;