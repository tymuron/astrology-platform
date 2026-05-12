-- Quiz tables for module-level quizzes

-- 1. Quizzes (one per module)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_id uuid REFERENCES public.weeks(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT 'Quiz',
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quizzes"
  ON quizzes FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can manage quizzes"
  ON quizzes FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

-- 2. Quiz questions (multiple choice)
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,  -- ["Option A", "Option B", "Option C", "Option D"]
  correct_index integer NOT NULL DEFAULT 0,     -- index into options array
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quiz questions"
  ON quiz_questions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can manage quiz questions"
  ON quiz_questions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );

-- 3. Quiz attempts (student results)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,  -- { "question_id": selected_index, ... }
  score integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts"
  ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts"
  ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view all quiz attempts"
  ON quiz_attempts FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
  );
