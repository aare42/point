'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { getLocalizedText, updateMultilingualText, hasTranslation } from '@/lib/utils/multilingual'
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, type LanguageCode } from '@/lib/constants/languages'

type EntityType = 'topics' | 'courses' | 'goal-templates' | 'vacancies'

interface BaseEntity {
  id: string
  name: any
  description?: any
}

interface Topic extends BaseEntity {
  slug: string
  keypoints: any
  type: string
}

interface Course extends BaseEntity {
  educator: {
    name: string
    email: string
  }
}

interface GoalTemplate extends BaseEntity {
  motto?: any
  author: {
    name: string
    email: string
  }
}

interface Vacancy extends BaseEntity {
  author: {
    name: string
    email: string
  }
}

type Entity = Topic | Course | GoalTemplate | Vacancy

export default function TranslationsPage() {
  const { t } = useLanguage()
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('topics')
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedTargetLanguage, setSelectedTargetLanguage] = useState<LanguageCode>('en')
  
  // Get all languages except the default one for translation targets
  const targetLanguages = Object.entries(SUPPORTED_LANGUAGES).filter(
    ([code]) => code !== DEFAULT_LANGUAGE
  )

  const entityConfig = {
    topics: {
      title: 'Topics',
      icon: '📚',
      apiPath: '/api/topics',
      adminPath: '/api/admin/topics',
      fields: ['name', 'description', 'keypoints']
    },
    courses: {
      title: 'Courses',
      icon: '🎓',
      apiPath: '/api/admin/courses',
      adminPath: '/api/admin/courses',
      fields: ['name', 'description']
    },
    'goal-templates': {
      title: 'Goal Templates',
      icon: '🎯',
      apiPath: '/api/goal-templates',
      adminPath: '/api/admin/goal-templates',
      fields: ['name', 'description', 'motto']
    },
    vacancies: {
      title: 'Vacancies',
      icon: '💼',
      apiPath: '/api/vacancies',
      adminPath: '/api/admin/vacancies',
      fields: ['name', 'description']
    }
  }

  useEffect(() => {
    fetchEntities()
  }, [selectedEntityType])

  const fetchEntities = async () => {
    setLoading(true)
    try {
      const config = entityConfig[selectedEntityType]
      const response = await fetch(`${config.apiPath}?lang=${DEFAULT_LANGUAGE}`)
      if (response.ok) {
        const data = await response.json()
        setEntities(data)
      }
    } catch (error) {
      console.error(`Failed to fetch ${selectedEntityType}:`, error)
    } finally {
      setLoading(false)
    }
  }

  const updateTranslation = async (entityId: string, field: string, translationText: string) => {
    setSaving(entityId)
    try {
      const entity = entities.find(e => e.id === entityId)
      if (!entity) return

      // Use the new updateMultilingualText utility
      const currentValue = (entity as any)[field]
      const updatedValue = updateMultilingualText(currentValue, translationText, selectedTargetLanguage)

      const config = entityConfig[selectedEntityType]
      const response = await fetch(`${config.adminPath}/${entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: updatedValue })
      })

      if (response.ok) {
        // Update local state
        setEntities(prev => prev.map(e => 
          e.id === entityId ? { ...e, [field]: updatedValue } : e
        ))
        setEditing(null)
      } else {
        alert('Failed to save translation')
      }
    } catch (error) {
      console.error('Failed to update translation:', error)
      alert('Failed to save translation')
    } finally {
      setSaving(null)
    }
  }

  const hasTargetTranslation = (text: any) => {
    return hasTranslation(text, selectedTargetLanguage)
  }

  const getTargetText = (text: any) => {
    return getLocalizedText(text, selectedTargetLanguage, '')
  }

  const getSourceText = (text: any) => {
    return getLocalizedText(text, DEFAULT_LANGUAGE, '')
  }

  const getEntityDisplayName = (entity: Entity) => {
    if (selectedEntityType === 'topics') {
      return `/${(entity as Topic).slug}`
    }
    if ('educator' in entity) {
      return (entity as Course).educator.name || (entity as Course).educator.email
    }
    if ('author' in entity) {
      return (entity as GoalTemplate | Vacancy).author.name || (entity as GoalTemplate | Vacancy).author.email
    }
    return ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    )
  }

  const config = entityConfig[selectedEntityType]
  const fields = config.fields

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Translation Manager
        </h1>
        <p className="text-gray-600 mb-6">
          Add translations from {SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE].nativeName} to other languages
        </p>
        
        {/* Entity Type Selector */}
        <div className="flex items-center space-x-4 mb-4">
          <label className="text-sm font-medium text-gray-700">
            Content Type:
          </label>
          <div className="flex space-x-2">
            {Object.entries(entityConfig).map(([key, conf]) => (
              <button
                key={key}
                onClick={() => setSelectedEntityType(key as EntityType)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedEntityType === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {conf.icon} {conf.title}
              </button>
            ))}
          </div>
        </div>
        
        {/* Language Selector */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Target Language:
          </label>
          <select
            value={selectedTargetLanguage}
            onChange={(e) => setSelectedTargetLanguage(e.target.value as LanguageCode)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {targetLanguages.map(([code, lang]) => (
              <option key={code} value={code}>
                {lang.flag} {lang.nativeName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {config.icon} {config.title} ({entities.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {config.title.slice(0, -1)}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE].flag} {SUPPORTED_LANGUAGES[DEFAULT_LANGUAGE].nativeName}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {SUPPORTED_LANGUAGES[selectedTargetLanguage].flag} {SUPPORTED_LANGUAGES[selectedTargetLanguage].nativeName}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entities.map((entity) => (
                <tr key={entity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {getSourceText(entity.name)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {getEntityDisplayName(entity)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      <div className="text-sm text-gray-900 truncate">
                        {getSourceText(entity.name)}
                      </div>
                      {getSourceText(entity.description) && (
                        <div className="text-xs text-gray-500 truncate mt-1">
                          {getSourceText(entity.description).substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {editing === entity.id ? (
                      <div className="space-y-2">
                        {fields.map(field => (
                          <div key={field}>
                            <label className="block text-xs text-gray-600 mb-1 capitalize">
                              {field}
                            </label>
                            {field === 'description' || field === 'keypoints' || field === 'motto' ? (
                              <textarea
                                defaultValue={getTargetText((entity as any)[field])}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                placeholder={`${SUPPORTED_LANGUAGES[selectedTargetLanguage].nativeName} ${field}`}
                                rows={2}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setEditing(null)
                                  }
                                }}
                                onBlur={(e) => {
                                  if (e.target.value.trim()) {
                                    updateTranslation(entity.id, field, e.target.value)
                                  }
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                defaultValue={getTargetText((entity as any)[field])}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                placeholder={`${SUPPORTED_LANGUAGES[selectedTargetLanguage].nativeName} ${field}`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateTranslation(entity.id, field, e.currentTarget.value)
                                  }
                                  if (e.key === 'Escape') {
                                    setEditing(null)
                                  }
                                }}
                                autoFocus={field === 'name'}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-900">
                          {getTargetText(entity.name) || (
                            <span className="text-gray-400 italic">No {SUPPORTED_LANGUAGES[selectedTargetLanguage].nativeName} translation</span>
                          )}
                        </div>
                        {getTargetText(entity.description) && (
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {getTargetText(entity.description).substring(0, 100)}...
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editing === entity.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditing(null)}
                          className="text-xs text-gray-600 hover:text-gray-800"
                          disabled={saving === entity.id}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditing(entity.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                        disabled={saving === entity.id}
                      >
                        {hasTargetTranslation(entity.name) ? 'Edit' : 'Add'} Translation
                      </button>
                    )}
                    {saving === entity.id && (
                      <span className="text-xs text-gray-500 ml-2">Saving...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How to add translations:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Select content type and target language from the dropdowns above</li>
          <li>• Click "Add Translation" next to any item</li>
          <li>• Fill in the translation for name (required)</li>
          <li>• Press Enter to save name fields, or Tab/click out for description fields</li>
          <li>• Use Escape to cancel editing</li>
          <li>• Translations will appear when users switch to that language</li>
        </ul>
      </div>
    </div>
  )
}