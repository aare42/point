'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminPage() {
  const { t } = useLanguage()
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const handleJSONImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      setImportResult(null)
      
      const text = await file.text()
      const jsonData = JSON.parse(text)
      
      const response = await fetch('/api/admin/import-json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      })

      if (response.ok) {
        const result = await response.json()
        setImportResult(`✅ Successfully imported: ${result.message}`)
      } else {
        const error = await response.json()
        setImportResult(`❌ Import failed: ${error.error}`)
      }
    } catch (error) {
      setImportResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const handleJSONExport = async () => {
    try {
      setExporting(true)
      
      const response = await fetch('/api/admin/export-json', {
        method: 'GET',
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `database-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        alert(`Export failed: ${error.error}`)
      }
    } catch (error) {
      alert(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setExporting(false)
    }
  }
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              🚀 {t('admin.dashboard_title')}
            </h1>
            <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
              {t('admin.platform_admin')}
            </p>
          </div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 h-20 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </div>

      {/* Database Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-green-200">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">📤</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('admin.export_database')}</h2>
            <p className="text-gray-600">{t('admin.export_description')}</p>
          </div>
          
          <div className="text-center">
            <button
              onClick={handleJSONExport}
              disabled={exporting}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('admin.exporting')}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('admin.download_backup')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-200">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">📥</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('admin.import_database')}</h2>
            <p className="text-gray-600">{t('admin.import_description')}</p>
          </div>
        
        <div className="max-w-md mx-auto">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-orange-300 border-dashed rounded-lg cursor-pointer bg-orange-50 hover:bg-orange-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-orange-600">
                <span className="font-semibold">{t('admin.click_upload')}</span> {t('admin.json_backup_file')}
              </p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".json"
              onChange={handleJSONImport}
              disabled={importing}
            />
          </label>
          
          {importing && (
            <div className="mt-4 flex items-center justify-center text-orange-600">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('admin.importing')}
            </div>
          )}
          
          {importResult && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 text-sm">
              {importResult}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link
          href="/admin/analytics"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-12">
            <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300 text-center">📊</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-indigo-700 transition-colors text-center">
              {t('admin.analytics')}
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors text-center text-lg">
              {t('admin.analytics_description')}
            </p>
            <div className="mt-8 flex items-center justify-center text-indigo-600 group-hover:text-indigo-800">
              <span className="font-medium text-lg">{t('admin.view_analytics')}</span>
              <svg className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/manage"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-12">
            <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300 text-center">⚙️</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-emerald-700 transition-colors text-center">
              {t('admin.manage_data')}
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors text-center text-lg">
              {t('admin.manage_data_description')}
            </p>
            <div className="mt-8 flex items-center justify-center text-emerald-600 group-hover:text-emerald-800">
              <span className="font-medium text-lg">{t('admin.manage_data')}</span>
              <svg className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/translations"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-12">
            <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300 text-center">🌐</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-purple-700 transition-colors text-center">
              Translations
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors text-center text-lg">
              Add English translations for Ukrainian content
            </p>
            <div className="mt-8 flex items-center justify-center text-purple-600 group-hover:text-purple-800">
              <span className="font-medium text-lg">Manage Translations</span>
              <svg className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/seed"
          className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="p-12">
            <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300 text-center">🌱</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-green-700 transition-colors text-center">
              Database Seeding
            </h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors text-center text-lg">
              Populate database with educational content
            </p>
            <div className="mt-8 flex items-center justify-center text-green-600 group-hover:text-green-800">
              <span className="font-medium text-lg">Seed Database</span>
              <svg className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}