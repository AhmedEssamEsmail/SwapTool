import { useEffect, useState, useCallback } from 'react'
import { useHeadcount } from '../../hooks/useHeadcount'
import { useAuth } from '../../hooks/useAuth'
import EmployeeTable from '../../components/Headcount/EmployeeTable'
import type { HeadcountUser, Department } from '../../types'

export default function EmployeeDirectory() {
  const { canEditHeadcount } = useAuth()
  const { getEmployees, getDepartments, loading } = useHeadcount()
  const [employees, setEmployees] = useState<HeadcountUser[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    role: '',
    search: '',
  })

  useEffect(() => {
    loadDepartments()
    loadEmployees()
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadEmployees()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [filters])

  async function loadDepartments() {
    const depts = await getDepartments()
    setDepartments(depts)
  }

  async function loadEmployees() {
    const data = await getEmployees(filters)
    setEmployees(data)
  }

  const clearFilters = useCallback(() => {
    setFilters({ department: '', status: '', role: '', search: '' })
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
          <p className="text-gray-600">View and manage workforce</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Name, email, or ID..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={filters.department}
              onChange={(e) => setFilters(f => ({ ...f, department: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="agent">Agent</option>
              <option value="tl">Team Lead</option>
              <option value="wfm">WFM</option>
            </select>
          </div>
        </div>

        {(filters.department || filters.status || filters.role || filters.search) && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Employees ({employees.length})
          </h2>
          {!canEditHeadcount() && (
            <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              View Only
            </span>
          )}
        </div>
        <EmployeeTable employees={employees} loading={loading} />
      </div>
    </div>
  )
  }
