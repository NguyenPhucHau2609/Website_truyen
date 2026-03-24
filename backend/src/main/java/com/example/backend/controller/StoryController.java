package com.example.backend.controller;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.example.backend.model.Author;
import com.example.backend.model.Bookmark;
import com.example.backend.model.Category;
import com.example.backend.model.Story;
import com.example.backend.model.User;
import com.example.backend.payload.request.StoryRequest;
import com.example.backend.payload.response.MessageResponse;
import com.example.backend.repository.AuthorRepository;
import com.example.backend.repository.BookmarkRepository;
import com.example.backend.repository.CategoryRepository;
import com.example.backend.repository.StoryRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.security.services.UserDetailsImpl;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/stories")
public class StoryController {

    @Autowired
    StoryRepository storyRepository;

    @Autowired
    CategoryRepository categoryRepository;

    @Autowired
    AuthorRepository authorRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    BookmarkRepository bookmarkRepository;

    @Autowired
    MongoTemplate mongoTemplate;

    @GetMapping
    public ResponseEntity<List<Story>> getAllStories() {
        return ResponseEntity.ok(storyRepository.findAll());
    }

    @GetMapping("/followed")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<List<Story>> getFollowedStories() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Optional<User> userOpt = userRepository.findById(userDetails.getId());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            List<String> followedIds = user.getFollowedStoryIds();
            if (followedIds != null && !followedIds.isEmpty()) {
                List<Story> stories = storyRepository.findAllById(followedIds);
                return ResponseEntity.ok(stories);
            }
        }
        return ResponseEntity.ok(List.of());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getStoryById(@PathVariable String id) {
        Optional<Story> story = storyRepository.findById(id);
        if (story.isPresent()) {
            return ResponseEntity.ok(story.get());
        }
        return ResponseEntity.badRequest().body(new MessageResponse("Error: Story not found!"));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Story>> searchStories(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type) {
        
        Query query = new Query();
        List<Criteria> criteria = new ArrayList<>();

        if (keyword != null && !keyword.isEmpty()) {
            criteria.add(new Criteria().orOperator(
                Criteria.where("title").regex(keyword, "i"),
                Criteria.where("description").regex(keyword, "i")
            ));
        }

        if (categoryId != null && !categoryId.isEmpty()) {
            criteria.add(Criteria.where("categories.$id").is(new org.bson.types.ObjectId(categoryId)));
        }

        if (status != null && !status.isEmpty()) {
            criteria.add(Criteria.where("status").is(status));
        }

        if (type != null && !type.isEmpty()) {
            criteria.add(Criteria.where("type").is(type));
        }

        if (!criteria.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
        }

        return ResponseEntity.ok(mongoTemplate.find(query, Story.class));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createStory(@Valid @RequestBody StoryRequest request) {
        Story story = new Story(request.getTitle(), request.getDescription(), request.getStatus());

        if (request.getCoverImage() != null) {
            story.setCoverImage(request.getCoverImage());
        }
        if (request.getType() != null) {
            story.setType(request.getType());
        }
        if (request.getRelatedStoryIds() != null) {
            story.setRelatedStoryIds(request.getRelatedStoryIds());
        }

        Set<Category> categories = new HashSet<>();
        if (request.getCategoryIds() != null) {
            request.getCategoryIds().forEach(catId -> {
                Category category = categoryRepository.findById(catId)
                        .orElseThrow(() -> new RuntimeException("Error: Category is not found."));
                categories.add(category);
            });
        }
        story.setCategories(categories);

        Set<Author> authors = new HashSet<>();
        if (request.getAuthorIds() != null) {
            request.getAuthorIds().forEach(authId -> {
                Author author = authorRepository.findById(authId)
                        .orElseThrow(() -> new RuntimeException("Error: Author is not found."));
                authors.add(author);
            });
        }
        story.setAuthors(authors);

        storyRepository.save(story);
        return ResponseEntity.ok(story);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateStory(@PathVariable String id, @Valid @RequestBody StoryRequest request) {
        Optional<Story> storyData = storyRepository.findById(id);

        if (storyData.isPresent()) {
            Story story = storyData.get();
            story.setTitle(request.getTitle());
            story.setDescription(request.getDescription());
            story.setUpdatedAt(new Date());

            if (request.getCoverImage() != null) {
                story.setCoverImage(request.getCoverImage());
            }

            if (request.getStatus() != null) {
                story.setStatus(request.getStatus());
            }
            if (request.getType() != null) {
                story.setType(request.getType());
            }
            if (request.getRelatedStoryIds() != null) {
                story.setRelatedStoryIds(request.getRelatedStoryIds());
            }

            if (request.getCategoryIds() != null) {
                Set<Category> categories = new HashSet<>();
                request.getCategoryIds().forEach(catId -> {
                    Category category = categoryRepository.findById(catId)
                            .orElseThrow(() -> new RuntimeException("Error: Category is not found."));
                    categories.add(category);
                });
                story.setCategories(categories);
            }

            if (request.getAuthorIds() != null) {
                Set<Author> authors = new HashSet<>();
                request.getAuthorIds().forEach(authId -> {
                    Author author = authorRepository.findById(authId)
                            .orElseThrow(() -> new RuntimeException("Error: Author is not found."));
                    authors.add(author);
                });
                story.setAuthors(authors);
            }

            return ResponseEntity.ok(storyRepository.save(story));
        }
        return ResponseEntity.badRequest().body(new MessageResponse("Error: Story not found!"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStory(@PathVariable String id) {
        if (!storyRepository.existsById(id)) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Story not found!"));
        }
        storyRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse("Story deleted successfully!"));
    }

    @PutMapping("/{id}/views")
    public ResponseEntity<?> incrementViews(@PathVariable String id) {
        Optional<Story> storyData = storyRepository.findById(id);
        if (storyData.isPresent()) {
            Story story = storyData.get();
            story.setViews(story.getViews() + 1);
            return ResponseEntity.ok(storyRepository.save(story));
        }
        return ResponseEntity.badRequest().body(new MessageResponse("Error: Story not found!"));
    }

    @PostMapping("/{id}/follow")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> followStory(@PathVariable String id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Optional<User> userOpt = userRepository.findById(userDetails.getId());
        Optional<Story> storyOpt = storyRepository.findById(id);

        if (userOpt.isPresent() && storyOpt.isPresent()) {
            User user = userOpt.get();
            Story story = storyOpt.get();

            if (user.getFollowedStoryIds() == null) {
                user.setFollowedStoryIds(new ArrayList<>());
            }

            if (!user.getFollowedStoryIds().contains(id)) {
                user.getFollowedStoryIds().add(id);
                story.setFollowers(story.getFollowers() + 1);
            } else {
                user.getFollowedStoryIds().remove(id);
                story.setFollowers(Math.max(0, story.getFollowers() - 1));
            }

            userRepository.save(user);
            storyRepository.save(story);
            return ResponseEntity.ok(java.util.Map.of(
                "isFollowing", user.getFollowedStoryIds().contains(id),
                "followers", story.getFollowers()
            ));
        }
        return ResponseEntity.badRequest().body(new MessageResponse("Error: Story or User not found!"));
    }

    @GetMapping("/{id}/is-following")
    @PreAuthorize("hasRole('USER') or hasRole('ADMIN')")
    public ResponseEntity<?> isFollowing(@PathVariable String id) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        Optional<User> userOpt = userRepository.findById(userDetails.getId());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            boolean isFollowing = user.getFollowedStoryIds() != null && user.getFollowedStoryIds().contains(id);
            return ResponseEntity.ok(java.util.Map.of("isFollowing", isFollowing));
        }
        return ResponseEntity.ok(java.util.Map.of("isFollowing", false));
    }

    @GetMapping("/{id}/related")
    public ResponseEntity<?> getRelatedStories(@PathVariable String id) {
        Optional<Story> storyOpt = storyRepository.findById(id);
        if (storyOpt.isPresent()) {
            Story story = storyOpt.get();
            List<Story> related = new ArrayList<>();
            if (story.getRelatedStoryIds() != null) {
                for (String rid : story.getRelatedStoryIds()) {
                    storyRepository.findById(rid).ifPresent(related::add);
                }
            }
            return ResponseEntity.ok(related);
        }
        return ResponseEntity.ok(List.of());
    }
}
