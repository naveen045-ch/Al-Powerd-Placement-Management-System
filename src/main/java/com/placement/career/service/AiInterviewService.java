package com.placement.career.service;

import com.placement.career.dto.AiInterviewSessionResponse;
import com.placement.career.dto.AiInterviewStartRequest;
import com.placement.career.entity.AiInterviewSession;
import com.placement.career.entity.StudentProfile;
import com.placement.career.repository.AiInterviewSessionRepository;
import com.placement.career.repository.StudentProfileRepository;
import com.placement.career.repository.UserRepository;
import org.springframework.stereotype.Service;
import com.placement.career.repository.AiInterviewQuestionRepository;
import com.placement.career.dto.AiInterviewQuestionResponse;
import com.placement.career.entity.AiInterviewQuestion;
import java.util.List;
import com.placement.career.dto.AiInterviewAnswerRequest;
import com.placement.career.entity.AiInterviewStatus;



@Service
public class AiInterviewService {

    private final AiInterviewSessionRepository sessionRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final AiInterviewQuestionRepository questionRepository;
    private final AiAnswerEvaluationService evaluationService;
    private final GeminiService geminiService;

    public AiInterviewService(
            AiInterviewSessionRepository sessionRepository,
            AiInterviewQuestionRepository questionRepository,
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            AiAnswerEvaluationService evaluationService,
            GeminiService geminiService) {

        this.sessionRepository = sessionRepository;
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.evaluationService = evaluationService;
        this.geminiService = geminiService;
    }

    public AiInterviewSessionResponse startInterview(
            String email,
            AiInterviewStartRequest request) {

        StudentProfile student = getStudent(email);

        int totalQuestions = request.totalQuestions() == null
                ? 5
                : request.totalQuestions();

        if (totalQuestions < 1 || totalQuestions > 20) {
            throw new RuntimeException(
                    "Total questions must be between 1 and 20"
            );
        }

        AiInterviewSession session = new AiInterviewSession();

        session.setStudent(student);
        session.setInterviewType(request.interviewType());
        session.setTargetRole(request.targetRole());
        session.setTotalQuestions(totalQuestions);
        session.setAnsweredQuestions(0);

        AiInterviewSession savedSession =
                sessionRepository.save(session);

        generateQuestions(savedSession);

        return toResponse(savedSession);
    }

    public List<AiInterviewQuestionResponse> getMyQuestions(
            String email,
            Long sessionId) {

        StudentProfile student = getStudent(email);

        AiInterviewSession session = sessionRepository
                .findById(sessionId)
                .orElseThrow(() ->
                        new RuntimeException("AI interview session not found")
                );

        if (!session.getStudent().getId().equals(student.getId())) {
            throw new RuntimeException(
                    "You are not authorized to access this interview"
            );
        }

        return questionRepository
                .findBySessionIdOrderByQuestionNumberAsc(sessionId)
                .stream()
                .map(question -> new AiInterviewQuestionResponse(
                        question.getId(),
                        question.getQuestionNumber(),
                        question.getQuestion(),
                        question.getTopic(),
                        question.getDifficulty(),
                        question.getAnswer(),
                        question.getScore(),
                        question.getFeedback()
                ))
                .toList();
    }
    public List<AiInterviewSessionResponse> getMyInterviews(
            String email) {

        StudentProfile student = getStudent(email);

        return sessionRepository
                .findByStudentIdOrderByStartedAtDesc(student.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public AiInterviewSessionResponse getMyInterview(
            String email,
            Long sessionId) {

        StudentProfile student = getStudent(email);

        AiInterviewSession session = sessionRepository
                .findById(sessionId)
                .orElseThrow(() ->
                        new RuntimeException("AI interview session not found")
                );

        if (!session.getStudent().getId().equals(student.getId())) {
            throw new RuntimeException(
                    "You are not authorized to access this interview"
            );
        }

        return toResponse(session);
    }

    private StudentProfile getStudent(String email) {

        var user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        return studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new RuntimeException("Student profile not found")
                );
    }

    private AiInterviewSessionResponse toResponse(
            AiInterviewSession session) {

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
    private void generateQuestions(
            AiInterviewSession session) {

        for (int i = 1; i <= session.getTotalQuestions(); i++) {

            String questionText =
                    geminiService.generateInterviewQuestion(
                            session.getInterviewType(),
                            session.getTargetRole(),
                            i
                    );

            AiInterviewQuestion question =
                    new AiInterviewQuestion();

            question.setSession(session);
            question.setQuestionNumber(i);
            question.setQuestion(questionText);
            question.setTopic(session.getTargetRole());
            question.setDifficulty("MEDIUM");

            questionRepository.save(question);
        }
    }

    public AiInterviewQuestionResponse submitAnswer(
            String email,
            Long sessionId,
            Long questionId,
            AiInterviewAnswerRequest request) {

        StudentProfile student = getStudent(email);

        AiInterviewSession session = sessionRepository
                .findById(sessionId)
                .orElseThrow(() ->
                        new RuntimeException("AI interview session not found")
                );

        if (!session.getStudent().getId().equals(student.getId())) {
            throw new RuntimeException(
                    "You are not authorized to access this interview"
            );
        }

        if (session.getStatus() != AiInterviewStatus.IN_PROGRESS) {
            throw new RuntimeException(
                    "This interview is no longer in progress"
            );
        }

        AiInterviewQuestion question = questionRepository
                .findById(questionId)
                .orElseThrow(() ->
                        new RuntimeException("Interview question not found")
                );

        if (!question.getSession().getId().equals(sessionId)) {
            throw new RuntimeException(
                    "Question does not belong to this interview"
            );
        }

        if (question.getAnswer() != null) {
            throw new RuntimeException(
                    "This question has already been answered"
            );
        }

        question.setAnswer(request.answer());

        AiAnswerEvaluationService.EvaluationResult evaluation =
                evaluationService.evaluate(
                        question.getQuestion(),
                        request.answer()
                );

        question.setScore(evaluation.score());
        question.setFeedback(evaluation.feedback());

        questionRepository.save(question);

        session.setAnsweredQuestions(
                session.getAnsweredQuestions() + 1
        );

        if (session.getAnsweredQuestions()
                .equals(session.getTotalQuestions())) {

            List<AiInterviewQuestion> questions =
                    questionRepository
                            .findBySessionIdOrderByQuestionNumberAsc(
                                    session.getId()
                            );

            double totalScore = questions.stream()
                    .filter(q -> q.getScore() != null)
                    .mapToDouble(AiInterviewQuestion::getScore)
                    .average()
                    .orElse(0.0);

            session.setOverallScore(
                    Math.round(totalScore * 100.0) / 100.0
            );

            session.setOverallFeedback(
                    generateOverallFeedback(totalScore)
            );

            session.setStatus(AiInterviewStatus.COMPLETED);

            session.setCompletedAt(
                    java.time.LocalDateTime.now()
            );
        }

        sessionRepository.save(session);

        return new AiInterviewQuestionResponse(
                question.getId(),
                question.getQuestionNumber(),
                question.getQuestion(),
                question.getTopic(),
                question.getDifficulty(),
                question.getAnswer(),
                question.getScore(),
                question.getFeedback()
        );
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
}