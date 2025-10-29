// components/admin/SubjectManagement.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiPlus, FiEdit, FiTrash2, FiSave, FiX, FiFolder, FiBook, FiSearch } from 'react-icons/fi';
import '../../css/subjectmanagement.css';

const SubjectManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [newSubject, setNewSubject] = useState({ name: '', category_id: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('categories');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/admin/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data.categories);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/admin/categories', 
        { name: newCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewCategory('');
      fetchSubjects();
    } catch (err) {
      console.error('Error adding category:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to add category');
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.name.trim() || !newSubject.category_id) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/admin/subjects', 
        newSubject,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewSubject({ name: '', category_id: '' });
      fetchSubjects();
    } catch (err) {
      console.error('Error adding subject:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to add subject');
    }
  };

  const handleUpdateCategory = async (categoryId, newName) => {
    if (!newName.trim()) {
      setEditingCategory(null);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/admin/categories/${categoryId}`, 
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingCategory(null);
      fetchSubjects();
    } catch (err) {
      console.error('Error updating category:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const ok = await window.pfConfirm?.('Are you sure you want to delete this category? This action cannot be undone.');
    if (!ok) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSubjects();
    } catch (err) {
      console.error('Error deleting category:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    const ok = await window.pfConfirm?.('Are you sure you want to delete this subject? This action cannot be undone.');
    if (!ok) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/admin/subjects/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSubjects();
    } catch (err) {
      console.error('Error deleting subject:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to delete subject');
    }
  };

  // Filter categories and subjects based on search
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.subjects.some(subject => 
      subject.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return (
      <div className="subject-management-loading">
        <div className="loading-spinner"></div>
        <p>Loading subjects and categories...</p>
      </div>
    );
  }

  return (
    <div className="subject-management">
      {/* Header */}
      <div className="sm-header">
        <div className="sm-header-content">
          <div className="sm-title-section">
            <div className="sm-header-icon">
              <FiBook />
            </div>
            <div>
              <h1 className="sm-main-title">Subject Management</h1>
              <p className="sm-subtitle">Manage learning categories and subjects</p>
            </div>
          </div>
          <div className="sm-stats">
            <div className="sm-stat-card">
              <FiFolder className="sm-stat-icon" />
              <span className="sm-stat-number">{categories.length}</span>
              <span className="sm-stat-label">Categories</span>
            </div>
            <div className="sm-stat-card">
              <FiBook className="sm-stat-icon" />
              <span className="sm-stat-number">
                {categories.reduce((total, cat) => total + cat.subjects.length, 0)}
              </span>
              <span className="sm-stat-label">Total Subjects</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="sm-toolbar">
        <div className="sm-search-container">
          <FiSearch className="sm-search-icon" />
          <input
            type="text"
            placeholder="Search categories or subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="sm-search-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="sm-search-clear"
            >
              <FiX />
            </button>
          )}
        </div>
        
        <div className="sm-tabs">
          <button 
            className={`sm-tab ${activeTab === 'categories' ? 'sm-tab-active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <FiFolder />
            Categories
          </button>
          <button 
            className={`sm-tab ${activeTab === 'subjects' ? 'sm-tab-active' : ''}`}
            onClick={() => setActiveTab('subjects')}
          >
            <FiBook />
            Subjects
          </button>
        </div>
      </div>

      {/* Add Category Section */}
      <div className="sm-section">
        <div className="sm-section-header">
          <h3>Add New Category</h3>
          <div className="sm-section-badge">Step 1</div>
        </div>
        <div className="sm-add-form">
          <div className="sm-input-group">
            <FiFolder className="sm-input-icon" />
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Enter category name (e.g., 'Technology', 'Arts')"
              className="sm-form-input"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
          </div>
          <button 
            onClick={handleAddCategory} 
            className="sm-btn-primary"
            disabled={!newCategory.trim()}
          >
            <FiPlus /> Add Category
          </button>
        </div>
      </div>

      {/* Add Subject Section */}
      <div className="sm-section">
        <div className="sm-section-header">
          <h3>Add New Subject</h3>
          <div className="sm-section-badge">Step 2</div>
        </div>
        <div className="sm-add-form">
          <div className="sm-input-group">
            <FiFolder className="sm-input-icon" />
            <select
              value={newSubject.category_id}
              onChange={(e) => setNewSubject({ ...newSubject, category_id: e.target.value })}
              className="sm-form-select"
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="sm-input-group">
            <FiBook className="sm-input-icon" />
            <input
              type="text"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
              placeholder="Enter subject name (e.g., 'JavaScript', 'Painting')"
              className="sm-form-input"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
            />
          </div>
          <button 
            onClick={handleAddSubject} 
            className="sm-btn-primary"
            disabled={!newSubject.name.trim() || !newSubject.category_id}
          >
            <FiPlus /> Add Subject
          </button>
        </div>
      </div>

      {/* Categories and Subjects List */}
      <div className="sm-section">
        <div className="sm-section-header">
          <h3>Existing Categories & Subjects</h3>
          <div className="sm-section-badge">
            {filteredCategories.length} {filteredCategories.length === 1 ? 'Category' : 'Categories'}
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="sm-empty-state">
            <FiBook className="sm-empty-icon" />
            <h3>No categories found</h3>
            <p>
              {searchTerm ? 
                'No categories or subjects match your search. Try different keywords.' : 
                'Get started by adding your first category above.'
              }
            </p>
          </div>
        ) : (
          <div className="sm-categories-grid">
            {filteredCategories.map(category => (
              <div key={category.id} className="sm-category-card">
                <div className="sm-category-header">
                  {editingCategory === category.id ? (
                    <div className="sm-edit-form">
                      <input
                        type="text"
                        defaultValue={category.name}
                        onBlur={(e) => handleUpdateCategory(category.id, e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory(category.id, e.target.value)}
                        autoFocus
                        className="sm-form-input sm-edit-input"
                      />
                      <div className="sm-edit-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateCategory(category.id, document.querySelector('.sm-edit-input').value);
                          }}
                          className="sm-btn-save"
                        >
                          <FiSave />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(null);
                          }}
                          className="sm-btn-cancel"
                        >
                          <FiX />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="sm-category-info">
                        <FiFolder className="sm-category-icon" />
                        <div>
                          <h4 className="sm-category-name">{category.name}</h4>
                          <span className="sm-category-count">
                            {category.subjects.length} {category.subjects.length === 1 ? 'subject' : 'subjects'}
                          </span>
                        </div>
                      </div>
                      <div className="sm-category-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(category.id);
                          }}
                          className="sm-btn-edit"
                          title="Edit category name"
                        >
                          <FiEdit />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }} 
                          className="sm-btn-delete"
                          disabled={category.subjects.length > 0}
                          title={
                            category.subjects.length > 0 
                              ? 'Cannot delete category with subjects' 
                              : 'Delete category'
                          }
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="sm-subjects-list">
                  {category.subjects.map(subject => (
                    <div key={subject.id} className="sm-subject-item">
                      <div className="sm-subject-info">
                        <FiBook className="sm-subject-icon" />
                        <span className="sm-subject-name">{subject.name}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubject(subject.id);
                        }} 
                        className="sm-btn-delete-sm"
                        title="Delete subject"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                  {category.subjects.length === 0 && (
                    <div className="sm-no-subjects">
                      <FiBook className="sm-no-subjects-icon" />
                      <span>No subjects in this category</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectManagement;