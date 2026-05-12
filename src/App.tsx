import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentLayout from './components/layout/StudentLayout';
import StudentDashboard from './pages/student/Dashboard';
import WelcomePage from './pages/student/WelcomePage';
import LektionView from './pages/student/LektionView';
import QuizView from './pages/student/QuizView';
import Library from './pages/student/Library';
import Profile from './pages/student/Profile';
import InstallGuide from './pages/student/InstallGuide';
import FeedbackPage from './pages/student/Feedback';

import TeacherLayout from './components/layout/TeacherLayout';
import CourseEditor from './pages/teacher/CourseEditor';
import Students from './pages/teacher/Students';
import ManageLibrary from './pages/teacher/ManageLibrary';
import ManageKohorten from './pages/teacher/ManageKohorten';
import SettingsPage from './pages/teacher/SettingsPage';
import QuizResults from './pages/teacher/QuizResults';
import TeacherFeedback from './pages/teacher/Feedback';

import { AuthProvider } from './contexts/AuthContext';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';

function App() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-vastu-light p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm max-w-lg w-full border border-gray-100 text-center">
                    <h1 className="text-2xl font-serif text-vastu-dark mb-4">Konfigurationsfehler</h1>
                    <p className="text-vastu-text-light mb-4">
                        Die Anwendung benötigt Umgebungsvariablen.
                    </p>
                    <div className="bg-vastu-light p-4 rounded-xl text-left text-sm font-mono text-vastu-text-light mb-6">
                        <p>Bitte setze folgende Variablen:</p>
                        <ul className="list-disc list-inside mt-2">
                            {!supabaseUrl && <li>VITE_SUPABASE_URL</li>}
                            {!supabaseKey && <li>VITE_SUPABASE_ANON_KEY</li>}
                        </ul>
                    </div>
                    <p className="text-sm text-vastu-text-light">
                        Überprüfe deine <code>.env</code> Datei oder das Deployment Dashboard.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/update-password" element={<UpdatePasswordPage />} />

                    {/* Welcome — full-screen landing (no sidebar) */}
                    <Route path="/student/welcome" element={<WelcomePage />} />

                    {/* Student Routes — with sidebar */}
                    <Route path="/student" element={<StudentLayout />}>
                        <Route index element={<StudentDashboard />} />
                        <Route path="module/:moduleId/lektion/:lektionId" element={<LektionView />} />
                        <Route path="module/:moduleId/quiz/:quizId" element={<QuizView />} />
                        <Route path="library" element={<Library />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="install" element={<InstallGuide />} />
                        <Route path="feedback" element={<FeedbackPage />} />
                    </Route>

                    {/* Teacher Routes */}
                    <Route path="/teacher" element={<TeacherLayout />}>
                        <Route index element={<CourseEditor />} />
                        <Route path="course-editor" element={<CourseEditor />} />
                        <Route path="students" element={<Students />} />
                        <Route path="library" element={<ManageLibrary />} />
                        <Route path="kohorten" element={<ManageKohorten />} />
                        <Route path="quiz-results" element={<QuizResults />} />
                        <Route path="feedback" element={<TeacherFeedback />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>

                    {/* Default redirect */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
