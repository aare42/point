'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { LanguageCode, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/lib/constants/languages'

// Re-export for backward compatibility
export type Language = LanguageCode

interface LanguageContextType {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: string, params?: Record<string, string>) => string
  availableLanguages: typeof SUPPORTED_LANGUAGES
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Translation dictionaries
const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.knowledge_graph': 'Knowledge Graph',
    'nav.courses': 'Courses',
    'nav.goals': 'Goals',
    'nav.vacancies': 'Vacancies',
    'nav.admin': 'Admin',
    'nav.sign_out': 'Sign Out',
    
    // Roles
    'role.student': 'Student',
    'role.educator': 'Educator',
    'role.employer': 'Employer',
    'role.switch_to': 'Switch to {{role}}',
    
    // Languages
    'language.english': 'English',
    'language.ukrainian': 'Українська',
    'language.switch_to': 'Switch to {{language}}',
    
    // Common UI
    'common.loading': 'Loading...',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.close': 'Close',
    
    // Knowledge Graph
    'graph.title': 'Knowledge Graph',
    'graph.subtitle': 'Explore the interconnected learning paths and prerequisites',
    'graph.search_topics': 'Search topics...',
    'graph.highlight_all': 'Highlight All Types',
    'graph.highlight_theory': 'Highlight Theory',
    'graph.highlight_practice': 'Highlight Practice',
    'graph.highlight_projects': 'Highlight Projects',
    'graph.total_topics': 'Total Topics',
    'graph.highlighted_topics': 'Highlighted Topics',
    'graph.projects': 'Projects',
    'graph.prerequisites': 'Prerequisites',
    'graph.unlocks': 'Unlocks',
    'graph.courses': 'Courses',
    'graph.zoom_instructions': 'Zoom with mouse wheel • Click nodes for details',
    
    // Topic Types
    'topic.theory': 'Theory',
    'topic.practice': 'Practice', 
    'topic.project': 'Project',
    
    // Learning Status
    'status.not_learned': 'Not Learned',
    'status.want_to_learn': 'Want to Learn',
    'status.learning': 'Learning',
    'status.learned': 'Learned',
    'status.validated': 'Validated',
    
    // Dashboard
    'dashboard.welcome': 'Welcome to Point',
    'dashboard.student.title': 'Student Dashboard',
    'dashboard.educator.title': 'Educator Dashboard',
    'dashboard.employer.title': 'Employer Dashboard',
    
    // Courses
    'courses.title': 'Courses',
    'courses.subtitle': 'Discover learning opportunities',
    'courses.browse_all': 'Browse all courses',
    'courses.topics_count': '{{count}} topics',
    'courses.students_count': '{{count}} students',
    
    // Goals
    'goals.title': 'Learning Goals',
    'goals.subtitle': 'Find inspiration for your learning journey',
    'goals.browse_templates': 'Browse goal templates',
    
    // Vacancies
    'vacancies.title': 'Vacancies',
    'vacancies.subtitle': 'Find opportunities that match your skills',
    'vacancies.create_learning_goal': 'Create Learning Goal',
    
    // Admin
    'admin.title': 'Admin Panel',
    'admin.topics': 'Topics',
    'admin.courses': 'Courses',
    'admin.users': 'Users',
    'admin.export': 'Export Data',
    'admin.import': 'Import Data',
    'admin.dashboard_title': 'Admin Dashboard',
    'admin.platform_admin': 'Platform administration split into analytics and data management',
    'admin.analytics': 'Analytics',
    'admin.analytics_description': 'View platform statistics, user engagement metrics, and detailed insights about your educational ecosystem',
    'admin.view_analytics': 'View Analytics',
    'admin.manage_data': 'Manage Data',
    'admin.manage_data_description': 'Create, edit, and delete platform entities: topics, courses, users, goals, and vacancies',
    'admin.export_database': 'Export Database',
    'admin.export_description': 'Download complete database backup as JSON',
    'admin.download_backup': 'Download Backup',
    'admin.exporting': 'Exporting...',
    'admin.import_database': 'Import Database',
    'admin.import_description': 'Import topics and other data from JSON backup files',
    'admin.click_upload': 'Click to upload',
    'admin.json_backup_file': 'JSON backup file',
    'admin.importing': 'Importing...',

    // Courses page
    'courses.browse_title': 'Browse Courses',
    'courses.discover_courses': 'Discover courses created by educators and start your learning journey',
    'courses.student_dashboard': 'Student Dashboard',
    'courses.knowledge_graph': 'Knowledge Graph',
    'courses.search_placeholder': 'Search courses, instructors, or descriptions...',
    'courses.filter_topic_placeholder': 'Filter by topic name...',
    'courses.found_results': 'Found {{count}} course{{plural}}',
    'courses.matching_search': 'matching "{{query}}"',
    'courses.clear_filters': 'Clear filters',
    'courses.more_topics': '+{{count}} more',
    'courses.topics_count_stat': '{{count}} topics',
    'courses.students_count_stat': '{{count}} students',
    'courses.no_courses_found': 'No courses found',
    'courses.no_courses_available': 'No courses available yet',
    'courses.adjust_search': 'Try adjusting your search or filters to find more courses.',
    'courses.educators_no_courses': 'Educators haven\'t created any courses yet. Check back later!',
    'courses.clear_filters_button': 'Clear Filters',
    'courses.ready_to_learn': 'Ready to Start Learning?',
    'courses.explore_knowledge_graph_cta': 'Explore the knowledge graph to see how topics connect and plan your learning path.',
    'courses.explore_knowledge_graph': 'Explore Knowledge Graph',
    'courses.loading': 'Loading courses...',

    // Goals page  
    'goals.browse_title': 'Browse Goals',
    'goals.discover_goals': 'Discover learning goals and get inspired by what others are working towards',
    'goals.search_placeholder': 'Search goal templates by name, author, description, or motivation...',
    'goals.found_templates': 'Found {{count}} goal template{{plural}}',
    'goals.clear_search': 'Clear search',
    'goals.learning_topics': 'Learning Topics:',
    'goals.students_used': '{{count}} students used',
    'goals.no_templates_found': 'No goal templates found',
    'goals.no_templates_available': 'No goal templates available yet',
    'goals.adjust_search_templates': 'Try adjusting your search terms to find more goal templates.',
    'goals.no_templates_created': 'No goal templates have been created yet. Check back later or contact an admin to create some templates!',
    'goals.clear_search_button': 'Clear Search',
    'goals.inspired_by_goals': 'Inspired by These Goals?',
    'goals.start_learning_journey': 'Start your own learning journey by setting goals and exploring courses that match your ambitions.',
    'goals.create_your_goals': 'Create Your Goals',
    'goals.find_courses': 'Find Courses',
    'goals.loading': 'Loading goals...',

    // Vacancies page
    'vacancies.browse_title': 'Browse Vacancies',
    'vacancies.discover_jobs': 'Discover job opportunities and skill requirements from employers',
    'vacancies.search_placeholder': 'Search vacancies, companies, or requirements...',
    'vacancies.found_vacancies': 'Found {{count}} {{plural}}',
    'vacancies.vacancy': 'vacancy',
    'vacancies.vacancies': 'vacancies',
    'vacancies.required_skills': 'Required Skills:',
    'vacancies.skills_count': '{{count}} skills',
    'vacancies.create_learning_goal': 'Create Learning Goal',
    'vacancies.creating_goal': 'Creating Goal...',
    'vacancies.sign_in_to_create': 'Sign In to Create Goal',
    'vacancies.no_vacancies_found': 'No vacancies found',
    'vacancies.no_vacancies_available': 'No vacancies available yet',
    'vacancies.adjust_search_vacancies': 'Try adjusting your search to find more job opportunities.',
    'vacancies.employers_no_vacancies': 'Employers haven\'t posted any vacancies yet. Check back later!',
    'vacancies.ready_build_skills': 'Ready to Build Your Skills?',
    'vacancies.explore_courses_cta': 'Explore courses and set learning goals to develop the skills employers are looking for.',
    'vacancies.browse_courses': 'Browse Courses',
    'vacancies.set_learning_goals': 'Set Learning Goals',
    'vacancies.loading': 'Loading vacancies...',

    // Student Dashboard
    'student.dashboard_title': 'Student Dashboard',
    'student.welcome_back': 'Welcome back, {{name}}! Track your learning progress and goals.',
    'student.active_goals': 'Active Goals',
    'student.topics_learned': 'Topics Learned',
    'student.currently_learning': 'Currently Learning',
    'student.want_to_learn': 'Want to Learn',
    'student.your_courses': 'Your Courses',
    'student.browse_courses': 'Browse Courses',
    'student.completed': 'Completed',
    'student.in_progress': 'In Progress',
    'student.enrolled': 'Enrolled',
    'student.progress': 'Progress',
    'student.complete': '{{percent}}% complete',
    'student.by_educator': 'by {{name}}',
    'student.view_all_courses': 'View all {{count}} courses →',
    'student.no_courses_yet': 'No courses yet',
    'student.enroll_courses': 'Enroll in courses to start learning with guided instruction!',
    'student.your_goals': 'Your Goals',
    'student.create_goal': 'Create Goal',
    'student.active': 'Active',
    'student.overdue': 'Overdue',
    'student.due_date': 'Due: {{date}}',
    'student.view_all_goals': 'View all {{count}} goals →',
    'student.no_goals_yet': 'No goals yet',
    'student.create_first_goal': 'Create your first learning goal to get started!',
    'student.create_your_first_goal': 'Create Your First Goal',
    'student.learning_progress': 'Learning Progress',
    'student.view_graph': 'View Graph',
    'student.recent_changes': 'Recent topic status changes ({{count}} changes):',
    'student.changed_at': 'Changed {{date}} at {{time}}',
    'student.validated': 'Validated',
    'student.learned': 'Learned',
    'student.learning': 'Learning',
    'student.want_to_learn_status': 'Want to Learn',
    'student.more_changes': '{{count}} more changes in your learning history',
    'student.no_learning_activity': 'No learning activity yet',
    'student.start_learning': 'Start learning and your progress will appear here!',
    'student.explore_topics': 'Explore Topics',
    'student.set_goals': 'Set Goals',
    'student.loading_dashboard': 'Loading your dashboard...',
    'student.please_sign_in': 'Please sign in to access your student dashboard.',

    // Educator Dashboard
    'educator.dashboard_title': 'Educator Dashboard',
    'educator.manage_courses': 'Manage your courses and track student progress',
    'educator.create_course': 'Create Course',
    'educator.total_courses': 'Total Courses',
    'educator.enrolled_students': 'Enrolled Students',
    'educator.topics_covered': 'Topics Covered',
    'educator.my_courses': 'My Courses',
    'educator.create_new': 'Create New',
    'educator.topics_count': '{{count}} topics',
    'educator.students_count': '{{count}} students',
    'educator.no_courses_yet': 'No courses yet',
    'educator.create_first_course': 'Create your first course to start teaching!',
    'educator.recent_enrollments': 'Recent Enrollments',
    'educator.no_enrollments': 'No enrollments yet',
    'educator.loading_dashboard': 'Loading educator dashboard...',
    'educator.failed_load': 'Failed to load educator dashboard',

    // Employer Dashboard
    'employer.dashboard_title': 'Employer Dashboard',
    'employer.welcome_back': 'Welcome back, {{name}}! Manage your job postings and discover talented candidates.',
    'employer.open_positions': 'Open Positions',
    'employer.skills_required': 'Skills Required',
    'employer.unique_skills': 'Unique Skills',
    'employer.avg_per_position': 'Avg. per Position',
    'employer.your_job_postings': 'Your Job Postings',
    'employer.post_job': 'Post Job',
    'employer.active': 'Active',
    'employer.skills_required_count': '{{count}} skills required',
    'employer.posted_date': 'Posted {{date}}',
    'employer.view_all_positions': 'View all {{count}} positions →',
    'employer.no_job_postings': 'No job postings yet',
    'employer.create_first_posting': 'Create your first job posting to start hiring!',
    'employer.post_first_job': 'Post Your First Job',
    'employer.potential_candidates': 'Potential Candidates',
    'employer.browse_all': 'Browse All',
    'employer.skills_count': '{{count}} skills',
    'employer.no_candidates': 'No candidates yet',
    'employer.students_will_appear': 'Students will appear here as they set learning goals!',
    'employer.browse_learning_goals': 'Browse Learning Goals',
    'employer.quick_actions': 'Quick Actions',
    'employer.post_new_job': 'Post New Job',
    'employer.post_job_description': 'Create a job posting with skill requirements',
    'employer.browse_candidates': 'Browse Candidates',
    'employer.browse_candidates_description': 'Find learners with relevant skills',
    'employer.skill_map': 'Skill Map',
    'employer.skill_map_description': 'Explore skill relationships and dependencies',
    
    // Landing Page
    'landing.welcome': 'Welcome to Point',
    'landing.subtitle': 'Build your learning trajectory with our knowledge graph platform',
    'landing.sign_in_google': 'Sign in with Google',
    'landing.educational_platform': 'Your educational knowledge platform',
    'landing.student_dashboard': 'Student Dashboard',
    'landing.student_description': 'Track your learning progress and manage topic statuses',
    'landing.go_to_dashboard': 'Go to Dashboard',
    'landing.learning_goals': 'Learning Goals',
    'landing.goals_description': 'Set and track your learning objectives with SMART goals',
    'landing.manage_goals': 'Manage Goals',
    'landing.browse_courses': 'Browse Courses',
    'landing.courses_description': 'Discover structured learning paths created by educators',
    'landing.knowledge_graph': 'Knowledge Graph',
    'landing.graph_description': 'Visualize topic connections and prerequisite relationships',
    'landing.explore_graph': 'Explore Graph',
  },
  uk: {
    // Navigation
    'nav.dashboard': 'Панель керування',
    'nav.knowledge_graph': 'Граф знань',
    'nav.courses': 'Курси',
    'nav.goals': 'Цілі',
    'nav.vacancies': 'Вакансії',
    'nav.admin': 'Адмін',
    'nav.sign_out': 'Вийти',
    
    // Roles
    'role.student': 'Студент',
    'role.educator': 'Викладач',
    'role.employer': 'Роботодавець',
    'role.switch_to': 'Перейти до {{role}}',
    
    // Languages
    'language.english': 'English',
    'language.ukrainian': 'Українська',
    'language.switch_to': 'Перейти на {{language}}',
    
    // Common UI
    'common.loading': 'Завантаження...',
    'common.search': 'Пошук',
    'common.filter': 'Фільтр',
    'common.save': 'Зберегти',
    'common.cancel': 'Скасувати',
    'common.delete': 'Видалити',
    'common.edit': 'Редагувати',
    'common.create': 'Створити',
    'common.back': 'Назад',
    'common.next': 'Далі',
    'common.previous': 'Попередній',
    'common.close': 'Закрити',
    
    // Knowledge Graph
    'graph.title': 'Граф знань',
    'graph.subtitle': 'Досліджуйте взаємозв\'язки між темами і будуйте свій навчальний шлях',
    'graph.search_topics': 'Пошук тем...',
    'graph.highlight_all': 'Виділити всі типи',
    'graph.highlight_theory': 'Виділити теорію',
    'graph.highlight_practice': 'Виділити практику',
    'graph.highlight_projects': 'Виділити проекти',
    'graph.total_topics': 'Всього тем',
    'graph.highlighted_topics': 'Виділені теми',
    'graph.projects': 'Проекти',
    'graph.prerequisites': 'Передумови',
    'graph.unlocks': 'Відкриває',
    'graph.courses': 'Курси',
    'graph.zoom_instructions': 'Масштабування колесом миші • Клік на вузли для деталей',
    
    // Topic Types
    'topic.theory': 'Теорія',
    'topic.practice': 'Практика',
    'topic.project': 'Проект',
    
    // Learning Status
    'status.not_learned': 'Не вивчено',
    'status.want_to_learn': 'Хочу вивчити',
    'status.learning': 'Вивчаю',
    'status.learned': 'Вивчено',
    'status.validated': 'Підтверджено',
    
    // Dashboard
    'dashboard.welcome': 'Ласкаво просимо до Point',
    'dashboard.student.title': 'Панель студента',
    'dashboard.educator.title': 'Панель викладача',
    'dashboard.employer.title': 'Панель роботодавця',
    
    // Courses
    'courses.title': 'Курси',
    'courses.subtitle': 'Відкрийте для себе можливості навчання',
    'courses.browse_all': 'Переглянути всі курси',
    'courses.topics_count': '{{count}} тем',
    'courses.students_count': '{{count}} студентів',
    
    // Goals
    'goals.title': 'Навчальні цілі',
    'goals.subtitle': 'Знайдіть натхнення для своєї навчальної подорожі',
    'goals.browse_templates': 'Переглянути шаблони цілей',
    
    // Vacancies
    'vacancies.title': 'Вакансії',
    'vacancies.subtitle': 'Знайдіть можливості, що відповідають вашим навичкам',
    'vacancies.create_learning_goal': 'Створити навчальну ціль',
    
    // Admin
    'admin.title': 'Панель адміністратора',
    'admin.topics': 'Теми',
    'admin.courses': 'Курси',
    'admin.users': 'Користувачі',
    'admin.export': 'Експорт даних',
    'admin.import': 'Імпорт даних',
    'admin.dashboard_title': 'Панель адміністратора',
    'admin.platform_admin': 'Адміністрування платформи поділено на аналітику та управління даними',
    'admin.analytics': 'Аналітика',
    'admin.analytics_description': 'Переглядайте статистику платформи, показники залученості користувачів та детальну інформацію про вашу освітню екосистему',
    'admin.view_analytics': 'Переглянути аналітику',
    'admin.manage_data': 'Управління даними',
    'admin.manage_data_description': 'Створюйте, редагуйте та видаляйте сутності платформи: теми, курси, користувачів, цілі та вакансії',
    'admin.export_database': 'Експорт бази даних',
    'admin.export_description': 'Завантажити повну резервну копію бази даних у форматі JSON',
    'admin.download_backup': 'Завантажити резервну копію',
    'admin.exporting': 'Експортування...',
    'admin.import_database': 'Імпорт бази даних',
    'admin.import_description': 'Імпортуйте теми та інші дані з файлів резервних копій JSON',
    'admin.click_upload': 'Натисніть для завантаження',
    'admin.json_backup_file': 'файлу резервної копії JSON',
    'admin.importing': 'Імпортування...',

    // Courses page
    'courses.browse_title': 'Перегляд курсів',
    'courses.discover_courses': 'Відкрийте для себе курси, створені викладачами, та розпочніть свою навчальну подорож',
    'courses.student_dashboard': 'Панель студента',
    'courses.knowledge_graph': 'Граф знань',
    'courses.search_placeholder': 'Шукати курси, інструкторів або описи...',
    'courses.filter_topic_placeholder': 'Фільтрувати за назвою теми...',
    'courses.found_results': 'Знайдено {{count}} курс{{plural}}',
    'courses.matching_search': 'відповідають "{{query}}"',
    'courses.clear_filters': 'Очистити фільтри',
    'courses.more_topics': '+{{count}} ще',
    'courses.topics_count_stat': '{{count}} тем',
    'courses.students_count_stat': '{{count}} студентів',
    'courses.no_courses_found': 'Курсів не знайдено',
    'courses.no_courses_available': 'Курси поки недоступні',
    'courses.adjust_search': 'Спробуйте скорегувати пошук або фільтри, щоб знайти більше курсів.',
    'courses.educators_no_courses': 'Викладачі ще не створили жодного курсу. Зайдіть пізніше!',
    'courses.clear_filters_button': 'Очистити фільтри',
    'courses.ready_to_learn': 'Готові почати навчання?',
    'courses.explore_knowledge_graph_cta': 'Досліджуйте граф знань, щоб побачити, як пов\'язані теми, та спланувати свій навчальний шлях.',
    'courses.explore_knowledge_graph': 'Дослідити граф знань',
    'courses.loading': 'Завантаження курсів...',

    // Goals page  
    'goals.browse_title': 'Перегляд цілей',
    'goals.discover_goals': 'Відкрийте для себе навчальні цілі та надихніться тим, над чим працюють інші',
    'goals.search_placeholder': 'Шукати шаблони цілей за назвою, автором, описом або мотивацією...',
    'goals.found_templates': 'Знайдено {{count}} шаблон{{plural}} цілей',
    'goals.clear_search': 'Очистити пошук',
    'goals.learning_topics': 'Навчальні теми:',
    'goals.students_used': '{{count}} студентів використали',
    'goals.no_templates_found': 'Шаблонів цілей не знайдено',
    'goals.no_templates_available': 'Шаблони цілей поки недоступні',
    'goals.adjust_search_templates': 'Спробуйте скорегувати пошукові терміни, щоб знайти більше шаблонів цілей.',
    'goals.no_templates_created': 'Шаблони цілей ще не створені. Зайдіть пізніше або зверніться до адміністратора для створення шаблонів!',
    'goals.clear_search_button': 'Очистити пошук',
    'goals.inspired_by_goals': 'Надихнулися цими цілями?',
    'goals.start_learning_journey': 'Розпочніть свою власну навчальну подорож, ставлячи цілі та досліджуючи курси, що відповідають вашим амбіціям.',
    'goals.create_your_goals': 'Створити ваші цілі',
    'goals.find_courses': 'Знайти курси',
    'goals.loading': 'Завантаження цілей...',

    // Vacancies page
    'vacancies.browse_title': 'Перегляд вакансій',
    'vacancies.discover_jobs': 'Відкрийте для себе робочі можливості та вимоги до навичок від роботодавців',
    'vacancies.search_placeholder': 'Шукати вакансії, компанії або вимоги...',
    'vacancies.found_vacancies': 'Знайдено {{count}} {{plural}}',
    'vacancies.vacancy': 'вакансію',
    'vacancies.vacancies': 'вакансій',
    'vacancies.required_skills': 'Необхідні навички:',
    'vacancies.skills_count': '{{count}} навичок',
    'vacancies.create_learning_goal': 'Створити навчальну ціль',
    'vacancies.creating_goal': 'Створення цілі...',
    'vacancies.sign_in_to_create': 'Увійдіть, щоб створити ціль',
    'vacancies.no_vacancies_found': 'Вакансій не знайдено',
    'vacancies.no_vacancies_available': 'Вакансії поки недоступні',
    'vacancies.adjust_search_vacancies': 'Спробуйте скорегувати пошук, щоб знайти більше робочих можливостей.',
    'vacancies.employers_no_vacancies': 'Роботодавці ще не опублікували жодних вакансій. Зайдіть пізніше!',
    'vacancies.ready_build_skills': 'Готові розвивати свої навички?',
    'vacancies.explore_courses_cta': 'Досліджуйте курси та ставте навчальні цілі, щоб розвинути навички, які шукають роботодавці.',
    'vacancies.browse_courses': 'Переглянути курси',
    'vacancies.set_learning_goals': 'Встановити навчальні цілі',
    'vacancies.loading': 'Завантаження вакансій...',

    // Student Dashboard
    'student.dashboard_title': 'Панель студента',
    'student.welcome_back': 'З поверненням, {{name}}! Відстежуйте свій навчальний прогрес та цілі.',
    'student.active_goals': 'Активні цілі',
    'student.topics_learned': 'Вивчені теми',
    'student.currently_learning': 'Зараз вивчаю',
    'student.want_to_learn': 'Хочу вивчити',
    'student.your_courses': 'Ваші курси',
    'student.browse_courses': 'Переглянути курси',
    'student.completed': 'Завершено',
    'student.in_progress': 'У процесі',
    'student.enrolled': 'Записаний',
    'student.progress': 'Прогрес',
    'student.complete': '{{percent}}% завершено',
    'student.by_educator': 'від {{name}}',
    'student.view_all_courses': 'Переглянути всі {{count}} курсів →',
    'student.no_courses_yet': 'Курсів поки немає',
    'student.enroll_courses': 'Запишіться на курси, щоб почати навчання з керівництвом!',
    'student.your_goals': 'Ваші цілі',
    'student.create_goal': 'Створити ціль',
    'student.active': 'Активна',
    'student.overdue': 'Прострочена',
    'student.due_date': 'Термін: {{date}}',
    'student.view_all_goals': 'Переглянути всі {{count}} цілей →',
    'student.no_goals_yet': 'Цілей поки немає',
    'student.create_first_goal': 'Створіть свою першу навчальну ціль, щоб розпочати!',
    'student.create_your_first_goal': 'Створити вашу першу ціль',
    'student.learning_progress': 'Навчальний прогрес',
    'student.view_graph': 'Переглянути граф',
    'student.recent_changes': 'Останні зміни статусу тем ({{count}} змін):',
    'student.changed_at': 'Змінено {{date}} о {{time}}',
    'student.validated': 'Підтверджено',
    'student.learned': 'Вивчено',
    'student.learning': 'Вивчаю',
    'student.want_to_learn_status': 'Хочу вивчити',
    'student.more_changes': '{{count}} більше змін у вашій навчальній історії',
    'student.no_learning_activity': 'Навчальної активності поки немає',
    'student.start_learning': 'Почніть навчання, і ваш прогрес з\'явиться тут!',
    'student.explore_topics': 'Дослідити теми',
    'student.set_goals': 'Встановити цілі',
    'student.loading_dashboard': 'Завантаження вашої панелі...',
    'student.please_sign_in': 'Будь ласка, увійдіть, щоб отримати доступ до панелі студента.',

    // Educator Dashboard
    'educator.dashboard_title': 'Панель викладача',
    'educator.manage_courses': 'Керуйте своїми курсами та відстежуйте прогрес студентів',
    'educator.create_course': 'Створити курс',
    'educator.total_courses': 'Всього курсів',
    'educator.enrolled_students': 'Записаних студентів',
    'educator.topics_covered': 'Охоплених тем',
    'educator.my_courses': 'Мої курси',
    'educator.create_new': 'Створити новий',
    'educator.topics_count': '{{count}} тем',
    'educator.students_count': '{{count}} студентів',
    'educator.no_courses_yet': 'Курсів поки немає',
    'educator.create_first_course': 'Створіть свій перший курс, щоб почати викладати!',
    'educator.recent_enrollments': 'Останні записи',
    'educator.no_enrollments': 'Записів поки немає',
    'educator.loading_dashboard': 'Завантаження панелі викладача...',
    'educator.failed_load': 'Не вдалося завантажити панель викладача',

    // Employer Dashboard
    'employer.dashboard_title': 'Панель роботодавця',
    'employer.welcome_back': 'З поверненням, {{name}}! Керуйте своїми вакансіями та знаходьте талановитих кандидатів.',
    'employer.open_positions': 'Відкриті позиції',
    'employer.skills_required': 'Необхідні навички',
    'employer.unique_skills': 'Унікальні навички',
    'employer.avg_per_position': 'В середньому на позицію',
    'employer.your_job_postings': 'Ваші оголошення про роботу',
    'employer.post_job': 'Опублікувати вакансію',
    'employer.active': 'Активна',
    'employer.skills_required_count': 'потрібно {{count}} навичок',
    'employer.posted_date': 'Опубліковано {{date}}',
    'employer.view_all_positions': 'Переглянути всі {{count}} позицій →',
    'employer.no_job_postings': 'Оголошень про роботу поки немає',
    'employer.create_first_posting': 'Створіть своє перше оголошення про роботу, щоб почати наймати!',
    'employer.post_first_job': 'Опублікувати першу вакансію',
    'employer.potential_candidates': 'Потенційні кандидати',
    'employer.browse_all': 'Переглянути всі',
    'employer.skills_count': '{{count}} навичок',
    'employer.no_candidates': 'Кандидатів поки немає',
    'employer.students_will_appear': 'Студенти з\'являтимуться тут, коли вони встановлюватимуть навчальні цілі!',
    'employer.browse_learning_goals': 'Переглянути навчальні цілі',
    'employer.quick_actions': 'Швидкі дії',
    'employer.post_new_job': 'Опублікувати нову вакансію',
    'employer.post_job_description': 'Створити оголошення про роботу з вимогами до навичок',
    'employer.browse_candidates': 'Переглянути кандидатів',
    'employer.browse_candidates_description': 'Знайти учнів з відповідними навичками',
    'employer.skill_map': 'Карта навичок',
    'employer.skill_map_description': 'Досліджувати взаємозв\'язки навичок та залежності',
    
    // Landing Page
    'landing.welcome': 'Ласкаво просимо до Point',
    'landing.subtitle': 'Будуйте свою навчальну траєкторію з нашою платформою графа знань',
    'landing.sign_in_google': 'Увійти через Google',
    'landing.educational_platform': 'Ваша освітня платформа',
    'landing.student_dashboard': 'Панель студента',
    'landing.student_description': 'Відстежуйте свій навчальний прогрес та керуйте статусами тем',
    'landing.go_to_dashboard': 'Перейти до панелі',
    'landing.learning_goals': 'Навчальні цілі',
    'landing.goals_description': 'Встановлюйте та відстежуйте свої навчальні цілі за SMART-методикою',
    'landing.manage_goals': 'Керувати цілями',
    'landing.browse_courses': 'Переглянути курси',
    'landing.courses_description': 'Відкрийте структуровані навчальні шляхи, створені викладачами',
    'landing.knowledge_graph': 'Граф знань',
    'landing.graph_description': 'Візуалізуйте зв\'язки між темами та відношення передумов',
    'landing.explore_graph': 'Досліджувати граф',
  }
}

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE)

  useEffect(() => {
    // Load language from localStorage
    const savedLanguage = localStorage.getItem('point-language') as LanguageCode
    if (savedLanguage && savedLanguage in SUPPORTED_LANGUAGES) {
      setLanguageState(savedLanguage)
    }
  }, [])

  const setLanguage = (newLanguage: LanguageCode) => {
    setLanguageState(newLanguage)
    localStorage.setItem('point-language', newLanguage)
  }

  const t = (key: string, params?: Record<string, string>): string => {
    let translation = translations[language][key] || translations['en'][key] || key
    
    // Replace parameters like {{param}} with actual values
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(new RegExp(`{{${paramKey}}}`, 'g'), paramValue)
      })
    }
    
    return translation
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, availableLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
