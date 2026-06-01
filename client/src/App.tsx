import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "@/routes/Home";
import Settings from "@/routes/Settings";
import QuizSelect from "@/routes/QuizSelect";
import Runner from "@/routes/Runner";
import Review from "@/routes/Review";
import Results from "@/routes/Results";
import ParentReview from "@/routes/ParentReview";
import ResultDetail from "@/routes/ResultDetail";
import { useSettingsStore } from "@/store/settings";
import Footer from "@/components/Footer";

export default function App() {
  const theme = useSettingsStore((s) => s.theme);
  const textSize = useSettingsStore((s) => s.textSize);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove(
      "theme-default",
      "theme-cream",
      "theme-dark",
      "theme-yellow-on-black",
    );
    html.classList.add(`theme-${theme}`);
    html.setAttribute("data-text-size", textSize);
  }, [theme, textSize]);

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile/:profile/settings" element={<Settings />} />
          <Route path="/profile/:profile/quizzes" element={<QuizSelect />} />
          <Route
            path="/profile/:profile/quiz/:quizId"
            element={<Runner />}
          />
          <Route
            path="/profile/:profile/quiz/:quizId/review"
            element={<Review />}
          />
          <Route
            path="/profile/:profile/results/:resultId"
            element={<ResultDetail />}
          />
          <Route path="/profile/:profile/results" element={<Results />} />
          <Route path="/review" element={<ParentReview />} />
          {/* Legacy / redirect old links */}
          <Route
            path="/profile/:profile/forms"
            element={<Navigate to="../quizzes" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
