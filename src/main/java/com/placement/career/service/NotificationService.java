package com.placement.career.service;

import com.placement.career.dto.NotificationResponse;
import com.placement.career.entity.Notification;
import com.placement.career.entity.User;
import com.placement.career.exception.ResourceNotFoundException;
import com.placement.career.repository.NotificationRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository) {

        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(
            String email,
            Pageable pageable) {

        User user = getUser(email);

        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String email) {

        User user = getUser(email);

        return notificationRepository
                .countByUserIdAndReadFalse(user.getId());
    }

    @Transactional
    public void markAsRead(
            String email,
            Long notificationId) {

        User user = getUser(email);

        Notification notification =
                notificationRepository
                        .findById(notificationId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Notification not found"));

        if (!notification.getUser().getId()
                .equals(user.getId())) {

            throw new IllegalArgumentException(
                    "You can update only your own notifications");
        }

        notification.setRead(true);

        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(String email) {

        User user = getUser(email);

        List<Notification> notifications =
                notificationRepository
                        .findByUserIdOrderByCreatedAtDesc(
                                user.getId());

        notifications.forEach(
                notification -> notification.setRead(true)
        );

        notificationRepository.saveAll(notifications);
    }

    @Transactional
    public void createNotification(
            Long userId,
            String title,
            String message) {

        User user = userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"));

        Notification notification = new Notification();

        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setRead(false);

        notificationRepository.save(notification);
    }

    private User getUser(String email) {

        return userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found"));
    }

    private NotificationResponse toResponse(
            Notification notification) {

        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
