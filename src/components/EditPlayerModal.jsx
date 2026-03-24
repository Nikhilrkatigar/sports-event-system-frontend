import { useState } from 'react';

export default function EditPlayerModal({ 
  player, 
  departments, 
  onSave, 
  onClose,
  onDelete,
  mode = 'edit' // 'edit' or 'add'
}) {
  const [formData, setFormData] = useState({
    name: player?.name || '',
    phone: player?.phone || '',
    uucms: player?.uucms || '',
    department: player?.department || '',
    gender: player?.gender || 'unspecified',
    isTeamLeader: player?.isTeamLeader || false,
    isSubstitute: player?.isSubstitute || false
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleChange = (field, value) => {
    // Auto-convert UUCMS to uppercase
    const finalValue = field === 'uucms' ? String(value || '').toUpperCase() : value;
    setFormData(prev => ({ ...prev, [field]: finalValue }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleRoleChange = (roleType, value) => {
    setFormData(prev => {
      const updated = { ...prev };
      if (roleType === 'substitute') {
        updated.isSubstitute = value;
        // If becoming substitute, can't be leader
        if (value) updated.isTeamLeader = false;
      } else if (roleType === 'leader' && !updated.isSubstitute) {
        updated.isTeamLeader = value;
      }
      return updated;
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Name is required';
    if (!formData.uucms?.trim()) newErrors.uucms = 'UUCMS is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
      // Modal will be closed by parent component on success
    } catch (error) {
      // Error is handled by parent component, keep modal open
      console.error('Error saving player details:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode === 'edit' && onDelete) {
      setDeleting(true);
      try {
        await onDelete(player._id);
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'add' ? 'Add New Player' : 'Edit Player Details'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Player name"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* UUCMS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UUCMS</label>
            <input
              type="text"
              value={formData.uucms}
              onChange={e => handleChange('uucms', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                errors.uucms ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., U02CG24S0001 (automatically UPPERCASE)"
            />
            {errors.uucms && <p className="text-xs text-red-500 mt-1">{errors.uucms}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Phone number"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              value={formData.department}
              onChange={e => handleChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={formData.gender}
              onChange={e => handleChange('gender', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unspecified">Unspecified</option>
            </select>
          </div>

          {/* Player Role */}
          <div className="border-t pt-4 mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Player Role</label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={!formData.isSubstitute && formData.isTeamLeader}
                  onChange={() => handleRoleChange('leader', true)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700">Team Leader (Main Player)</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={!formData.isSubstitute && !formData.isTeamLeader}
                  onChange={() => handleRoleChange('leader', false)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700">Main Player</span>
              </label>
              
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={formData.isSubstitute}
                  onChange={() => handleRoleChange('substitute', true)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700">Substitute</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
            >
              {saving ? 'Saving...' : mode === 'add' ? 'Add Player' : 'Save Changes'}
            </button>
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium text-sm"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="flex-1 bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
