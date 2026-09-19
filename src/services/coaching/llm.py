from src.services.config.workout_config import PROMPT


## LLM Coach Class
class LLMCoach:
    def __init__(self, mistral_client=None):
        self.client = mistral_client
        self.history = []
        self.system_prompt = PROMPT

    def _fallback_feedback(self, event, issue):
        if event == "workout_started":
            return "Workout started. Stay controlled and focus on your form."
        if event == "set_completed":
            return "Great set. Rest briefly, then keep your next set controlled."
        if event == "workout_completed":
            return "Workout complete. Excellent work today."
        if event == "no_pose_detected":
            return "Please move into the camera frame so I can track your form."
        return issue or "Keep your movement controlled and maintain steady breathing."

    def give_feedback(self, event, issue, metrics=None):
        if self.client is None:
            return self._fallback_feedback(event, issue)

        prompt = f"Event: {event}"

        if issue:
            prompt += f"Form Issue: {issue}"

        if metrics:
            prompt += f" Current Metrics: {metrics}"

        messages = [
            {"role": "system", "content": self.system_prompt},
            *self.history[-10:],
            {"role": "user", "content": prompt},
        ]

        try:
            response = self.client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=messages,
                temperature=0.4,
                max_completion_tokens=256,
            )
        except Exception:
            return self._fallback_feedback(event, issue)
        text = (response.choices[0].message.content or "").strip()
        if not text:
            text = issue or "Keep your form controlled and maintain steady breathing."

        self.history.append({"role": "assistant", "content": text})

        return text
