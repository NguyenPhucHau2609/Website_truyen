package com.example.backend.controller;

import java.util.Date;
import java.util.List;
import java.util.Optional;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.example.backend.model.Chapter;
import com.example.backend.model.Notification;
import com.example.backend.model.User;
import com.example.backend.payload.request.ChapterRequest;
import com.example.backend.payload.response.MessageResponse;
import com.example.backend.repository.ChapterRepository;
import com.example.backend.repository.NotificationRepository;
import com.example.backend.repository.UserRepository;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/chapters")
public class ChapterController {

    @Autowired
    ChapterRepository chapterRepository;

    @Autowired
    NotificationRepository notificationRepository;

    @Autowired
    UserRepository userRepository;

    @GetMapping("/story/{storyId}")
    public ResponseEntity<List<Chapter>> getChaptersByStory(@PathVariable String storyId) {
        return ResponseEntity.ok(chapterRepository.findByStoryIdOrderByChapterNumberAsc(storyId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getChapterById(@PathVariable String id) {
        Optional<Chapter> chapter = chapterRepository.findById(id);
        if (chapter.isPresent()) {
            return ResponseEntity.ok(chapter.get());
        }
        return ResponseEntity.badRequest().body(new MessageResponse("Error: Chapter not found!"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createChapter(@Valid @RequestBody ChapterRequest request) {
        Chapter chapter = new Chapter(request.getStoryId(), request.getChapterNumber(),
                request.getTitle(), request.getContent());
        if (request.getPages() != null) {
            chapter.setPages(request.getPages());
        }
        chapterRepository.save(chapter);

        // Send notifications to followers
        List<User> followers = userRepository.findByFollowedStoryIdsContaining(request.getStoryId());
        for (User user : followers) {
            Notification notification = new Notification(
                user.getId(),
                "Chương mới: " + request.getTitle(),
                request.getStoryId(),
                chapter.getId()
            );
            notificationRepository.save(notification);
        }

        return ResponseEntity.ok(chapter);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateChapter(@PathVariable String id, @Valid @RequestBody ChapterRequest request) {
        Optional<Chapter> chapterData = chapterRepository.findById(id);
        if (chapterData.isPresent()) {
            Chapter chapter = chapterData.get();
            chapter.setTitle(request.getTitle());
            chapter.setContent(request.getContent());
            chapter.setChapterNumber(request.getChapterNumber());
            if (request.getPages() != null) {
                chapter.setPages(request.getPages());
            }
            chapter.setUpdatedAt(new Date());
            return ResponseEntity.ok(chapterRepository.save(chapter));
        }
        return ResponseEntity.badRequest().body(new MessageResponse("Error: Chapter not found!"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteChapter(@PathVariable String id) {
        if (!chapterRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Chapter not found!"));
        }
        chapterRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse("Chapter deleted successfully!"));
    }
}
