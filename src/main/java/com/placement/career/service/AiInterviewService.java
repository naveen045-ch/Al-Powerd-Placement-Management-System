package com.placement.career.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.placement.career.dto.AiInterviewAnswerRequest;
import com.placement.career.dto.AiInterviewQuestionResponse;
import com.placement.career.dto.AiInterviewSessionResponse;
import com.placement.career.dto.AiInterviewStartRequest;
import com.placement.career.entity.AiInterviewQuestion;
import com.placement.career.entity.AiInterviewSession;
import com.placement.career.entity.AiInterviewStatus;
import com.placement.career.entity.StudentProfile;
import com.placement.career.repository.AiInterviewQuestionRepository;
import com.placement.career.repository.AiInterviewSessionRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiInterviewService {

    private final AiInterviewSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AiInterviewQuestionRepository questionRepository;
    private final AiAnswerEvaluationService evaluationService;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    public AiInterviewService(
            AiInterviewSessionRepository sessionRepository,
            AiInterviewQuestionRepository questionRepository,
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            AiAnswerEvaluationService evaluationService,
            GeminiService geminiService,
            ObjectMapper objectMapper) {

        this.sessionRepository = sessionRepository;
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.evaluationService = evaluationService;
        this.geminiService = geminiService;
        this.objectMapper = objectMapper;
    }

    public AiInterviewSessionResponse startInterview(
            String email,
            AiInterviewStartRequest request) {

        StudentProfile student = getStudent(email);
        int totalQuestions = request.totalQuestions() == null ? 5 : request.totalQuestions();

        if (totalQuestions < 1 || totalQuestions > 20) {
            throw new RuntimeException("Total questions must be between 1 and 20");
        }

        AiInterviewSession session = new AiInterviewSession();
        session.setStudent(student);
        session.setInterviewType(request.interviewType());
        session.setTargetRole(request.targetRole());
        session.setTotalQuestions(totalQuestions);
        session.setAnsweredQuestions(0);

        AiInterviewSession savedSession = sessionRepository.save(session);
        generateQuestions(savedSession);
        return toResponse(savedSession);
    }

    public List<AiInterviewQuestionResponse> getMyQuestions(String email, Long sessionId) {
        StudentProfile student = getStudent(email);
        AiInterviewSession session = getOwnedSession(student, sessionId);

        return questionRepository.findBySessionIdOrderByQuestionNumberAsc(sessionId)
                .stream()
                .map(this::toQuestionResponse)
                .toList();
    }

    public List<AiInterviewSessionResponse> getMyInterviews(String email) {
        StudentProfile student = getStudent(email);
        return sessionRepository.findByStudentIdOrderByStartedAtDesc(student.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public AiInterviewSessionResponse getMyInterview(String email, Long sessionId) {
        StudentProfile student = getStudent(email);
        return toResponse(getOwnedSession(student, sessionId));
    }

    private StudentProfile getStudent(String email) {
        var user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Student profile not found"));
    }

    private AiInterviewSession getOwnedSession(StudentProfile student, Long sessionId) {
        AiInterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("AI interview session not found"));

        if (!session.getStudent().getId().equals(student.getId())) {
            throw new RuntimeException("You are not authorized to access this interview");
        }
        return session;
    }

    private AiInterviewSessionResponse toResponse(AiInterviewSession session) {
        return new AiInterviewSessionResponse(
                session.getId(),
                session.getInterviewType(),
                session.getTargetRole(),
                session.getTotalQuestions(),
                session.getAnsweredQuestions(),
                session.getOverallScore(),
                session.getOverallFeedback(),
                session.getStatus(),
                session.getStartedAt(),
                session.getCompletedAt()
        );
    }

    private void generateQuestions(AiInterviewSession session) {
        boolean gateSession = isGateSession(session);

        for (int i = 1; i <= session.getTotalQuestions(); i++) {
            AiInterviewQuestion question = new AiInterviewQuestion();
            question.setSession(session);
            question.setQuestionNumber(i);

            if (gateSession) {
                GeminiService.GateQuestionData data = geminiService.generateGateQuestion(
                        session.getTargetRole(), i
                );
                question.setQuestion(data.question());
                question.setSection(data.section());
                question.setTopic(data.topic());
                question.setDifficulty(data.difficulty());
                question.setQuestionType(data.questionType());
                question.setCorrectAnswer(data.correctAnswer());
                question.setExplanation(data.explanation());
                question.setMarks(data.marks());
                question.setNegativeMarks(data.negativeMarks());
                question.setAnswerTolerance(data.answerTolerance());

                try {
                    question.setOptionsJson(objectMapper.writeValueAsString(data.options()));
                } catch (JsonProcessingException exception) {
                    throw new RuntimeException("Could not save GATE question options", exception);
                }
            } else {
                String questionText = geminiService.generateInterviewQuestion(
                        session.getInterviewType(), session.getTargetRole(), i
                );
                question.setQuestion(questionText);
                question.setTopic(session.getTargetRole());
                question.setDifficulty("MEDIUM");
                question.setQuestionType("TEXT");
            }

            questionRepository.save(question);
        }
    }

    @Transactional
    public AiInterviewQuestionResponse submitAnswer(
            String email,
            Long sessionId,
            Long questionId,
            AiInterviewAnswerRequest request) {

        StudentProfile student = getStudent(email);
        AiInterviewSession session = getOwnedSession(student, sessionId);

        if (session.getStatus() != AiInterviewStatus.IN_PROGRESS) {
            throw new RuntimeException("This interview is no longer in progress");
        }

        AiInterviewQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Interview question not found"));

        if (!question.getSession().getId().equals(sessionId)) {
            throw new RuntimeException("Question does not belong to this interview");
        }
        if (question.getAnswer() != null) {
            throw new RuntimeException("This question has already been answered");
        }
        if (request.answer() == null || request.answer().isBlank()) {
            throw new RuntimeException("Answer cannot be empty");
        }

        question.setAnswer(request.answer().trim());

        if (isObjectiveQuestion(question)) {
            ObjectiveEvaluation result = evaluateObjectiveAnswer(question, request.answer());
            question.setScore(result.score());
            question.setFeedback(result.feedback());
        } else {
            AiAnswerEvaluationService.EvaluationResult evaluation = evaluationService.evaluate(
                    question.getQuestion(), request.answer()
            );
            question.setScore(evaluation.score());
            question.setFeedback(evaluation.feedback());
        }

        questionRepository.save(question);
        session.setAnsweredQuestions(session.getAnsweredQuestions() + 1);

        if (session.getAnsweredQuestions().equals(session.getTotalQuestions())) {
            List<AiInterviewQuestion> questions = questionRepository
                    .findBySessionIdOrderByQuestionNumberAsc(session.getId());

            if (isGateSession(session)) {
                double earnedMarks = questions.stream()
                        .filter(q -> q.getScore() != null)
                        .mapToDouble(AiInterviewQuestion::getScore)
                        .sum();
                double maximumMarks = questions.stream()
                        .filter(q -> q.getMarks() != null)
                        .mapToDouble(AiInterviewQuestion::getMarks)
                        .sum();
                session.setOverallScore(round2(earnedMarks));
                session.setOverallFeedback(generateGateOverallFeedback(earnedMarks, maximumMarks));
            } else {
                double averageScore = questions.stream()
                        .filter(q -> q.getScore() != null)
                        .mapToDouble(AiInterviewQuestion::getScore)
                        .average()
                        .orElse(0.0);
                session.setOverallScore(round2(averageScore));
                session.setOverallFeedback(generateOverallFeedback(averageScore));
            }

            session.setStatus(AiInterviewStatus.COMPLETED);
            session.setCompletedAt(java.time.LocalDateTime.now());
        }

        sessionRepository.save(session);
        return toQuestionResponse(question);
    }

    private boolean isGateSession(AiInterviewSession session) {
        return session.getTargetRole() != null
                && session.getTargetRole().toUpperCase(Locale.ROOT).contains("GATE CSE");
    }

    private boolean isObjectiveQuestion(AiInterviewQuestion question) {
        String type = question.getQuestionType() == null
                ? "TEXT" : question.getQuestionType().toUpperCase(Locale.ROOT);
        return List.of("MCQ", "MSQ", "NAT").contains(type)
                && question.getCorrectAnswer() != null;
    }

    private ObjectiveEvaluation evaluateObjectiveAnswer(
            AiInterviewQuestion question,
            String submittedAnswer) {

        String type = question.getQuestionType().toUpperCase(Locale.ROOT);
        double marks = question.getMarks() == null ? 1.0 : question.getMarks();

        if ("NAT".equals(type)) {
            try {
                double expected = Double.parseDouble(question.getCorrectAnswer().trim().replace(",", ""));
                double actual = Double.parseDouble(submittedAnswer.trim().replace(",", ""));
                double tolerance = question.getAnswerTolerance() == null
                        ? 0.01 : question.getAnswerTolerance();
                boolean correct = Math.abs(expected - actual) <= tolerance;
                double score = correct ? marks : 0.0;
                return new ObjectiveEvaluation(
                        score,
                        correct
                                ? "Correct. You earned " + formatMarks(score) + " marks."
                                : "Incorrect. No marks awarded for this NAT answer."
                );
            } catch (NumberFormatException exception) {
                return new ObjectiveEvaluation(0.0, "Enter a valid numeric answer. No marks awarded.");
            }
        }

        Set<String> expectedCodes = parseExpectedCodes(question.getCorrectAnswer());
        Set<String> actualCodes = parseSubmittedCodes(submittedAnswer);
        boolean correct = !expectedCodes.isEmpty() && expectedCodes.equals(actualCodes);

        if ("MSQ".equals(type)) {
            return new ObjectiveEvaluation(
                    correct ? marks : 0.0,
                    correct
                            ? "Correct. All correct options were selected. You earned " + formatMarks(marks) + " marks."
                            : "Incorrect selection. MSQ questions receive marks only when the complete correct set is selected."
            );
        }

        if (correct) {
            return new ObjectiveEvaluation(marks, "Correct. You earned " + formatMarks(marks) + " marks.");
        }

        double penalty = question.getNegativeMarks() == null ? (marks == 2.0 ? 0.67 : 0.33)
                : question.getNegativeMarks();
        return new ObjectiveEvaluation(-penalty,
                "Incorrect. " + formatMarks(penalty) + " negative marks applied.");
    }

    private Set<String> parseExpectedCodes(String answer) {
        Set<String> codes = new HashSet<>();
        if (answer == null) return codes;

        for (String token : answer.toUpperCase(Locale.ROOT).split("[,;|\\s]+")) {
            String normalized = token.trim().replaceAll("[^A-D]", "");
            if (normalized.matches("[A-D]")) codes.add(normalized);
        }
        return codes;
    }

    private Set<String> parseSubmittedCodes(String answer) {
        Set<String> codes = new HashSet<>();
        if (answer == null) return codes;

        // Frontend sends answers such as "A. option text; C. option text".
        for (String token : answer.split("[;|,\\n]+")) {
            Matcher matcher = Pattern.compile("^\\s*([A-D])(?:\\s*[.)])?").matcher(token);
            if (matcher.find()) {
                codes.add(matcher.group(1).toUpperCase(Locale.ROOT));
                continue;
            }
            String normalized = token.trim().toUpperCase(Locale.ROOT);
            if (normalized.matches("[A-D]")) codes.add(normalized);
        }
        return codes;
    }

    private AiInterviewQuestionResponse toQuestionResponse(AiInterviewQuestion question) {
        boolean attempted = question.getAnswer() != null;
        return new AiInterviewQuestionResponse(
                question.getId(),
                question.getQuestionNumber(),
                question.getQuestion(),
                question.getTopic(),
                question.getDifficulty(),
                question.getAnswer(),
                question.getScore(),
                question.getFeedback(),
                question.getSection(),
                question.getQuestionType(),
                question.getOptionsJson(),
                question.getMarks(),
                question.getNegativeMarks(),
                attempted ? question.getCorrectAnswer() : null,
                attempted ? question.getExplanation() : null
        );
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String formatMarks(double value) {
        return String.format(Locale.ROOT, "%.2f", value);
    }

    private String generateGateOverallFeedback(double earnedMarks, double maximumMarks) {
        double percentage = maximumMarks <= 0 ? 0.0 : (earnedMarks / maximumMarks) * 100.0;
        return "GATE CSE practice completed. Score: " + formatMarks(earnedMarks)
                + " / " + formatMarks(maximumMarks) + " marks ("
                + formatMarks(percentage) + "%). Review the explanations and revise topics where marks were lost.";
    }

    private String generateOverallFeedback(double score) {
        if (score >= 8) {
            return "Excellent performance. You demonstrated strong technical understanding.";
        }
        if (score >= 6) {
            return "Good performance. Continue practicing technical concepts and improve answer depth.";
        }
        if (score >= 4) {
            return "Average performance. Focus on strengthening your fundamentals and explaining concepts clearly.";
        }
        return "Needs improvement. Practice core concepts and provide more detailed answers.";
    }

    private record ObjectiveEvaluation(double score, String feedback) { }
}
