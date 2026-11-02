package com.placement.career.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_interview_questions")
public class AiInterviewQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private AiInterviewSession session;

    @Column(nullable = false)
    private Integer questionNumber;

    @Column(nullable = false, length = 2000)
    private String question;

    @Column(length = 100)
    private String topic;

    @Column(length = 50)
    private String difficulty;

    @Column(length = 5000)
    private String answer;

    @Column
    private Double score;

    @Column(length = 3000)
    private String feedback;

    // GATE CBT fields. Existing HR/Technical interviews use questionType = TEXT.
    @Column(length = 100)
    private String section;

    @Column(length = 20)
    private String questionType = "TEXT";

    @Column(columnDefinition = "TEXT")
    private String optionsJson;

    // Correct answer and explanation are returned to the student only after submission.
    @Column(length = 1000)
    private String correctAnswer;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column
    private Double marks;

    @Column
    private Double negativeMarks;

    @Column
    private Double answerTolerance;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public AiInterviewSession getSession() { return session; }
    public void setSession(AiInterviewSession session) { this.session = session; }

    public Integer getQuestionNumber() { return questionNumber; }
    public void setQuestionNumber(Integer questionNumber) { this.questionNumber = questionNumber; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }

    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }

    public String getOptionsJson() { return optionsJson; }
    public void setOptionsJson(String optionsJson) { this.optionsJson = optionsJson; }

    public String getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }

    public Double getMarks() { return marks; }
    public void setMarks(Double marks) { this.marks = marks; }

    public Double getNegativeMarks() { return negativeMarks; }
    public void setNegativeMarks(Double negativeMarks) { this.negativeMarks = negativeMarks; }

    public Double getAnswerTolerance() { return answerTolerance; }
    public void setAnswerTolerance(Double answerTolerance) { this.answerTolerance = answerTolerance; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
