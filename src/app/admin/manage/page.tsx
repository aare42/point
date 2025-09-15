'use client'

import Link from 'next/link'

export default function AdminManagePage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Data Management</h1>
          <p className="text-gray-600">Create, edit, and delete platform entities</p>
        </div>
        <Link
          href="/admin"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          ← Back to Admin
        </Link>
      </div>

      {/* Management Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Topics Management */}
        <Link
          href="/admin/topics"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-8">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🧠</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-indigo-700 transition-colors">
              Knowledge Topics
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors">
              CRUD operations for knowledge graph topics with prerequisites
            </p>
            <div className="mt-6 flex items-center text-indigo-600 group-hover:text-indigo-800">
              <span className="font-medium">Manage Topics</span>
              <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Users Management */}
        <Link
          href="/admin/users"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-8">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">👥</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-emerald-700 transition-colors">
              User Management
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors">
              View and manage user accounts, roles, and permissions
            </p>
            <div className="mt-6 flex items-center text-emerald-600 group-hover:text-emerald-800">
              <span className="font-medium">Manage Users</span>
              <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Courses Management */}
        <Link
          href="/admin/courses"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-8">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-purple-700 transition-colors">
              Course Management
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors">
              Create, edit, and delete educational courses and enrollments
            </p>
            <div className="mt-6 flex items-center text-purple-600 group-hover:text-purple-800">
              <span className="font-medium">Manage Courses</span>
              <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Goal Templates Management */}
        <Link
          href="/admin/goal-templates"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-8">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-orange-700 transition-colors">
              Goal Templates
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors">
              Create and manage reusable goal templates for students
            </p>
            <div className="mt-6 flex items-center text-orange-600 group-hover:text-orange-800">
              <span className="font-medium">Manage Templates</span>
              <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Vacancies Management */}
        <Link
          href="/admin/vacancies"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-cyan-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-8">
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">💼</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-teal-700 transition-colors">
              Job Vacancies
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors">
              Create, edit, and delete job vacancy skill requirements
            </p>
            <div className="mt-6 flex items-center text-teal-600 group-hover:text-teal-800">
              <span className="font-medium">Manage Vacancies</span>
              <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>

      </div>
    </div>
  )
}