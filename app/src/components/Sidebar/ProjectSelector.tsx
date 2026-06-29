import type { ProjectConfig } from '../../types/config'

interface Props {
  projects: ProjectConfig[]
  selected: string
  onChange: (name: string) => void
}

export function ProjectSelector({ projects, selected, onChange }: Props) {
  return (
    <div className="px-3 py-2 border-b border-gray-100">
      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
        Project
      </label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm text-gray-800 bg-transparent border-0 focus:ring-0 p-0 font-medium cursor-pointer"
      >
        {projects.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  )
}
