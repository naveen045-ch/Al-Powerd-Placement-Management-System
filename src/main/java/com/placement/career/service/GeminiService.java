package com.placement.career.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.GenerateContentResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;

@Service
public class GeminiService {

    private final Client geminiClient;
    private final String model;
    private final ObjectMapper objectMapper;

    public GeminiService(
            Client geminiClient,
            @Value("${gemini.model}") String model,
            ObjectMapper objectMapper) {

        this.geminiClient = geminiClient;
        this.model = model;
        this.objectMapper = objectMapper;
    }

    /** Existing text-question generator. Kept for HR/Technical/Mixed interviews. */
    public String generateInterviewQuestion(
            String interviewType,
            String targetRole,
            int questionNumber) {

        String prompt = """
                Generate one interview question.

                Interview type: %s
                Target role: %s
                Question number: %d

                Requirements:
                - Ask a practical interview question.
                - Focus on skills relevant to the target role.
                - Do not include the answer.
                - Return only the question text.
                """.formatted(interviewType, targetRole, questionNumber);

        GenerateContentResponse response = geminiClient.models.generateContent(
                model,
                prompt,
                null
        );

        String text = response.text();
        if (text == null || text.isBlank()) {
            throw new RuntimeException("Gemini returned no text response");
        }
        return text.trim();
    }

    /** Structured GATE CSE question generator. Answer keys remain server-side. */
    public GateQuestionData generateGateQuestion(
            String targetRole,
            int questionNumber) {

        String expectedSection = getExpectedSection(targetRole, questionNumber);
        String expectedTopic = getExpectedTopic(targetRole);

        String prompt = """
                Create exactly ONE original, technically correct GATE CSE practice question.
                Return a single valid JSON object only. Do not use Markdown fences or text outside JSON.

                Practice selection: %s
                Question number: %d
                Required section: %s
                Selected topic (when applicable): %s

                Section rules:
                - If this is a FULL MOCK, use the required section above. Across each block of 10 questions,
                  questions 1-2 should be General Aptitude, question 3 Engineering Mathematics,
                  and questions 4-10 Core Computer Science. Rotate topics within each section.
                - If this is section-wise practice, stay strictly within the selected section and topic.
                - General Aptitude can include Verbal Ability, Quantitative Aptitude and Analytical Reasoning.
                - Core Computer Science topics include Programming & Data Structures, Algorithms, DBMS,
                  Operating Systems, Computer Networks, Theory of Computation, Compiler Design,
                  Computer Organization & Architecture and Digital Logic.
                - Engineering Mathematics includes Discrete Mathematics, Linear Algebra, Calculus,
                  Probability & Statistics and Numerical Methods.

                Question format rules:
                - questionType must be exactly MCQ, MSQ or NAT.
                - MCQ: exactly four options A, B, C, D and exactly one correct option.
                - MSQ: exactly four options A, B, C, D and two or more correct options.
                - NAT: no options; correctAnswer must be a numeric value represented as a string.
                - Use a realistic GATE-level difficulty and avoid ambiguous or trick wording.
                - Do not copy a known question verbatim.
                - Do not put the answer or explanation inside the question text.
                - MCQ marks must be 1 or 2. negativeMarks must be 0.33 for 1 mark or 0.67 for 2 marks.
                - MSQ and NAT marks must be 1 or 2 and negativeMarks must be 0.
                - For NAT, answerTolerance should normally be 0.01. For MCQ/MSQ use null.
                - explanation should briefly explain why the correct answer is correct.

                JSON schema:
                {
                  "section": "General Aptitude | Engineering Mathematics | Core Computer Science",
                  "topic": "specific topic name",
                  "questionType": "MCQ | MSQ | NAT",
                  "question": "question text",
                  "options": [
                    {"code": "A", "label": "option text"},
                    {"code": "B", "label": "option text"},
                    {"code": "C", "label": "option text"},
                    {"code": "D", "label": "option text"}
                  ],
                  "correctAnswer": "A or A,C or numeric value",
                  "explanation": "brief solution or explanation",
                  "difficulty": "EASY | MEDIUM | HARD",
                  "marks": 1,
                  "negativeMarks": 0.33,
                  "answerTolerance": null
                }
                """.formatted(
                targetRole,
                questionNumber,
                expectedSection,
                expectedTopic
        );

        GenerateContentResponse response = geminiClient.models.generateContent(
                model,
                prompt,
                null
        );

        String responseText = response.text();
        if (responseText == null || responseText.isBlank()) {
            throw new RuntimeException("Gemini returned an empty GATE question");
        }

        try {
            String json = removeMarkdownFences(responseText);
            JsonNode root = objectMapper.readTree(json);

            String question = text(root, "question");
            String questionType = text(root, "questionType").toUpperCase(Locale.ROOT);
            String correctAnswer = text(root, "correctAnswer");

            if (question.isBlank()) {
                throw new IllegalArgumentException("Question text is missing");
            }
            if (!List.of("MCQ", "MSQ", "NAT").contains(questionType)) {
                throw new IllegalArgumentException("Unsupported questionType: " + questionType);
            }
            if (correctAnswer.isBlank()) {
                throw new IllegalArgumentException("Correct answer is missing");
            }

            List<GateOption> options = readOptions(root.path("options"));
            if (("MCQ".equals(questionType) || "MSQ".equals(questionType)) && options.size() != 4) {
                throw new IllegalArgumentException("MCQ/MSQ must contain exactly four options");
            }
            if ("NAT".equals(questionType)) {
                options = List.of();
            }

            double marks = number(root.path("marks"), 1.0);
            if (marks != 1.0 && marks != 2.0) {
                marks = 1.0;
            }

            double negativeMarks = 0.0;
            if ("MCQ".equals(questionType)) {
                negativeMarks = number(
                        root.path("negativeMarks"),
                        marks == 2.0 ? 0.67 : 0.33
                );
                if (negativeMarks <= 0.0 || negativeMarks > marks) {
                    negativeMarks = marks == 2.0 ? 0.67 : 0.33;
                }
            }

            Double tolerance = "NAT".equals(questionType)
                    ? number(root.path("answerTolerance"), 0.01)
                    : null;
            if (tolerance != null && tolerance < 0) {
                tolerance = 0.01;
            }

            String section = text(root, "section");
            if (section.isBlank()) section = expectedSection;
            String topic = text(root, "topic");
            if (topic.isBlank()) topic = expectedTopic.isBlank() ? section : expectedTopic;
            String difficulty = text(root, "difficulty");
            if (difficulty.isBlank()) difficulty = "MEDIUM";
            String explanation = text(root, "explanation");

            return new GateQuestionData(
                    section,
                    topic,
                    questionType,
                    question,
                    options,
                    correctAnswer,
                    explanation,
                    difficulty,
                    marks,
                    negativeMarks,
                    tolerance
            );
        } catch (Exception exception) {
            throw new RuntimeException(
                    "Could not parse the GATE question returned by Gemini. Please retry. Details: "
                            + exception.getMessage(),
                    exception
            );
        }
    }

    private String getExpectedSection(String targetRole, int questionNumber) {
        String upper = targetRole == null ? "" : targetRole.toUpperCase(Locale.ROOT);
        if (upper.contains("FULL MOCK")) {
            int position = ((questionNumber - 1) % 10) + 1;
            if (position <= 2) return "General Aptitude";
            if (position == 3) return "Engineering Mathematics";
            return "Core Computer Science";
        }

        String[] parts = targetRole == null ? new String[0] : targetRole.split("\\|");
        if (parts.length > 1 && !parts[1].isBlank()) return parts[1].trim();
        return "Core Computer Science";
    }

    private String getExpectedTopic(String targetRole) {
        if (targetRole == null) return "";
        String[] parts = targetRole.split("\\|");
        if (parts.length > 2 && !parts[2].isBlank()
                && !parts[1].toUpperCase(Locale.ROOT).contains("FULL MOCK")) {
            return parts[2].trim();
        }
        return "Choose an appropriate topic from the required section";
    }

    private List<GateOption> readOptions(JsonNode optionsNode) {
        List<GateOption> options = new ArrayList<>();
        if (optionsNode == null || optionsNode.isNull()) return options;

        if (optionsNode.isArray()) {
            for (JsonNode option : optionsNode) {
                String code = text(option, "code");
                String label = text(option, "label");
                if (label.isBlank()) label = text(option, "text");
                if (code.isBlank()) code = String.valueOf((char) ('A' + options.size()));
                if (!label.isBlank()) options.add(new GateOption(code.toUpperCase(Locale.ROOT), label));
            }
        } else if (optionsNode.isObject()) {
            Iterator<String> names = optionsNode.fieldNames();
            while (names.hasNext()) {
                String code = names.next();
                String label = optionsNode.path(code).asText("");
                if (!label.isBlank()) options.add(new GateOption(code.toUpperCase(Locale.ROOT), label));
            }
        }
        return options;
    }

    private String removeMarkdownFences(String text) {
        String cleaned = text.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```(?:json)?\\s*", "");
            cleaned = cleaned.replaceFirst("\\s*```$", "");
        }
        return cleaned.trim();
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? "" : value.asText("").trim();
    }

    private double number(JsonNode node, double fallback) {
        if (node == null || node.isNull()) return fallback;
        if (node.isNumber()) return node.asDouble();
        try {
            return Double.parseDouble(node.asText().trim());
        } catch (NumberFormatException exception) {
            return fallback;
        }
    }

    public record GateOption(String code, String label) { }

    public record GateQuestionData(
            String section,
            String topic,
            String questionType,
            String question,
            List<GateOption> options,
            String correctAnswer,
            String explanation,
            String difficulty,
            Double marks,
            Double negativeMarks,
            Double answerTolerance) { }
}
