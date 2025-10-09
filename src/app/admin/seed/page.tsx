'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AdminSeedPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSeed = async (force = false) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/admin/seed${force ? '?force=true' : ''}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || data.message || 'Seeding failed')
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/admin"
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              ← Back to Admin
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Database Seeding</h1>
          <p className="mt-2 text-gray-600">
            Populate the database with educational content from production-data.json
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Seeding Options</h2>
          
          <div className="space-y-4">
            <div>
              <button
                onClick={() => handleSeed(false)}
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium mr-4"
              >
                {loading ? 'Seeding...' : 'Seed Database'}
              </button>
              <span className="text-sm text-gray-600">
                Only seeds if database is empty
              </span>
            </div>

            <div>
              <button
                onClick={() => handleSeed(true)}
                disabled={loading}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium mr-4"
              >
                {loading ? 'Force Seeding...' : 'Force Reseed'}
              </button>
              <span className="text-sm text-gray-600">
                ⚠️ Clears all existing data and reseeds
              </span>
            </div>
          </div>
        </div>

        {/* Results */}
        {(result || error) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Results</h3>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {result && (
              <div className={`p-4 border rounded-lg ${
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h4 className={`font-medium ${
                  result.success ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {result.success ? 'Success' : 'Info'}
                </h4>
                <p className={`mt-1 ${
                  result.success ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {result.message}
                </p>
                
                {result.topicsCreated !== undefined && (
                  <div className="mt-2 text-sm">
                    <p>Topics created: {result.topicsCreated}</p>
                    <p>Prerequisites created: {result.prerequisitesCreated}</p>
                    {result.adminUser && <p>Admin user: {result.adminUser}</p>}
                  </div>
                )}

                {result.existingTopics !== undefined && (
                  <p className="mt-2 text-sm">
                    Existing topics in database: {result.existingTopics}
                  </p>
                )}
              </div>
            )}

            {result && result.details && (
              <div className="mt-4 p-3 bg-gray-50 border rounded text-sm">
                <h5 className="font-medium text-gray-800">Details:</h5>
                <pre className="mt-1 text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Instructions</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• <strong>Seed Database</strong>: Safely adds topics only if database is empty</li>
            <li>• <strong>Force Reseed</strong>: Clears all data and rebuilds from scratch</li>
            <li>• The system uses data from <code>public/production-data.json</code></li>
            <li>• After seeding, check the Knowledge Graph and Topics admin pages</li>
          </ul>
        </div>
      </div>
    </div>
  )
}