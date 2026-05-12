export type UserRole = 'student' | 'teacher';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

export type MaterialType = 'video' | 'pdf' | 'pptx' | 'doc' | 'link' | 'zip' | 'image';

export interface Material {
    id: string;
    title: string;
    type: MaterialType;
    url: string;
    description?: string;
    isHomework?: boolean;
}

export interface Lektion {
    id: string;
    title: string;
    description?: string;
    materials: Material[];
    vimeoUrl?: string;
    date?: string;
    isCompleted?: boolean;
    homeworkDescription?: string;
    homeworkChecklist?: string;
}

export interface Module {
    id: string;
    title: string;
    description?: string;
    lektionen: Lektion[];
    moduleMaterials: Material[];
    isLocked: boolean;
    availableFrom?: string;
}

export interface Course {
    id: string;
    title: string;
    modules: Module[];
}

export interface LiveStream {
    id: string;
    title: string;
    date: string;
    video_url?: string;
    vimeo_url?: string;
    rutube_url?: string;
    audio_url?: string;
    description?: string;
    created_at?: string;
}

export interface PlatformSettings {
    id: boolean;
    welcome_video_url?: string | null;
    zoom_link?: string | null;
    telegram_link?: string | null;
    vastu_map_link?: string | null;
    instruction_url?: string | null;
    updated_at: string;
}

export interface StreamComment {
    id: string;
    stream_id: string;
    user_id: string;
    userName?: string;
    userAvatar?: string;
    content: string;
    created_at: string;
}

export type LibraryCategory = 'slides' | 'bonus' | 'guide' | 'template' | 'links';

export interface LibraryItem {
    id: string;
    title: string;
    category: LibraryCategory;
    file_url: string;
    description?: string;
    created_at: string;
    file_type?: string;
    is_master_file?: boolean;
    available_from?: string;
}

export interface Review {
    id: string;
    user_id: string;
    review_url: string;
    created_at: string;
}

export interface Kohorte {
    id: string;
    name: string;
    startDate?: string;
    start_date?: string;
    description?: string;
    color?: string;
    created_at?: string;
}

export interface QuizQuestion {
    id: string;
    quiz_id: string;
    question: string;
    options: string[];
    correct_index: number;
    order_index: number;
}

export type QuizType = 'quiz' | 'reflection';

export interface Quiz {
    id: string;
    week_id: string;
    title: string;
    description?: string;
    quiz_type: QuizType;
    questions: QuizQuestion[];
}

export interface QuizAttempt {
    id: string;
    user_id: string;
    quiz_id: string;
    answers: Record<string, number>;
    score: number;
    total: number;
    completed_at: string;
}

export interface FeedbackResponse {
    id: string;
    user_id: string;
    question_key: string;
    answer_rating: number | null;
    answer_text: string | null;
    created_at: string;
    updated_at: string;
}

export type FeedbackAnswers = Record<string, { rating?: number; text?: string }>;

export type FeedbackQuestionKind = 'rating' | 'text' | 'choice';

export interface FeedbackChoice {
    value: string;
    label: string;
}

export interface FeedbackQuestion {
    id: string;
    question_key: string;
    label: string;
    helper: string | null;
    kind: FeedbackQuestionKind;
    choices: FeedbackChoice[] | null;
    optional: boolean;
    order_index: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
