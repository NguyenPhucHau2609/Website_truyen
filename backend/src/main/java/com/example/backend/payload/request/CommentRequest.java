package com.example.backend.payload.request;

import jakarta.validation.constraints.NotBlank;

public class CommentRequest {
    @NotBlank
    private String storyId;

    private String chapterId;

    private Integer pageIndex;

    @NotBlank
    private String content;

    public String getStoryId() { return storyId; }
    public void setStoryId(String storyId) { this.storyId = storyId; }

    public String getChapterId() { return chapterId; }
    public void setChapterId(String chapterId) { this.chapterId = chapterId; }

    public Integer getPageIndex() { return pageIndex; }
    public void setPageIndex(Integer pageIndex) { this.pageIndex = pageIndex; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
