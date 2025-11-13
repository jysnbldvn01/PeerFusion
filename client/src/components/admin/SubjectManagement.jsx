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
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');
  const API_BASE_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data.categories || []);
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
      await axios.post(`${API_BASE_URL}/api/admin/categories`, 
        { name: newCategory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewCategory('');
      fetchSubjects();
      window.pfToast?.added?.('Category added successfully');
    } catch (err) {
      console.error('Error adding category:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to add category');
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.name.trim() || !newSubject.category_id) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/admin/subjects`, 
        newSubject,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewSubject({ name: '', category_id: '' });
      fetchSubjects();
      window.pfToast?.added?.('Subject added successfully');
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
      await axios.put(`${API_BASE_URL}/api/admin/categories/${categoryId}`, 
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingCategory(null);
      setEditCategoryName('');
      fetchSubjects();
      window.pfToast?.updated?.('Category updated successfully');
    } catch (err) {
      console.error('Error updating category:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to update category');
    }
  };

  const handleUpdateSubject = async (subjectId, newName) => {
    if (!newName.trim()) {
      setEditingSubject(null);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/admin/subjects/${subjectId}`, 
        { name: newName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingSubject(null);
      setEditSubjectName('');
      fetchSubjects();
      window.pfToast?.updated?.('Subject updated successfully');
    } catch (err) {
      console.error('Error updating subject:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to update subject');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? All subjects in this category will also be deleted. This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSubjects();
      window.pfToast?.deleted?.('Category deleted successfully');
    } catch (err) {
      console.error('Error deleting category:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/admin/subjects/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchSubjects();
      window.pfToast?.deleted?.('Subject deleted successfully');
    } catch (err) {
      console.error('Error deleting subject:', err);
      window.pfToast?.error?.(err.response?.data?.error || 'Failed to delete subject');
    }
  };

  // Start editing category
  const startEditCategory = (category) => {
    setEditingCategory(category.id);
    setEditCategoryName(category.name);
  };

  // Start editing subject
  const startEditSubject = (subject) => {
    setEditingSubject(subject.id);
    setEditSubjectName(subject.name);
  };

  // Filter categories and subjects based on active tab and search
  const filteredData = categories.filter(item => {
    if (activeTab === 'categories') {
      return item.name.toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      return item.subjects.some(subject => 
        subject.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  });

  // Get subjects for subjects tab
  const allSubjects = categories.flatMap(category => 
    category.subjects.map(subject => ({
      ...subject,
      categoryName: category.name
    }))
  ).filter(subject => 
    subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Skeleton loading components
  const SkeletonCategoryCard = () => (
    <div className="sm-category-card sm-skeleton">
      <div className="sm-category-header">
        <div className="sm-category-info">
          <div className="sm-skeleton-icon"></div>
          <div>
            <div className="sm-skeleton-line sm-skeleton-title"></div>
            <div className="sm-skeleton-line sm-skeleton-subtitle"></div>
          </div>
        </div>
        <div className="sm-category-actions">
          <div className="sm-skeleton-button"></div>
          <div className="sm-skeleton-button"></div>
        </div>
      </div>
      <div className="sm-subjects-list">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="sm-subject-item">
            <div className="sm-subject-info">
              <div className="sm-skeleton-icon sm-small"></div>
              <div className="sm-skeleton-line"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SkeletonStats = () => (
    <div className="sm-stats">
      <div className="sm-stat-card sm-skeleton">
        <div className="sm-skeleton-icon"></div>
        <div className="sm-skeleton-stat"></div>
        <div className="sm-skeleton-label"></div>
      </div>
      <div className="sm-stat-card sm-skeleton">
        <div className="sm-skeleton-icon"></div>
        <div className="sm-skeleton-stat"></div>
        <div className="sm-skeleton-label"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="subject-management">
        {/* Header Skeleton */}
        <div className="sm-header">
          <div className="sm-header-content">
            <div className="sm-title-section">
              <div className="sm-skeleton-icon sm-header-icon"></div>
              <div>
                <div className="sm-skeleton-line sm-skeleton-main-title"></div>
                <div className="sm-skeleton-line sm-skeleton-subtitle"></div>
              </div>
            </div>
            <SkeletonStats />
          </div>
        </div>

        {/* Toolbar Skeleton */}
        <div className="sm-toolbar">
          <div className="sm-skeleton-search"></div>
          <div className="sm-skeleton-tabs"></div>
        </div>

        {/* Form Sections Skeleton */}
        <div className="sm-section">
          <div className="sm-section-header">
            <div className="sm-skeleton-line sm-section-title"></div>
            <div className="sm-skeleton-badge"></div>
          </div>
          <div className="sm-skeleton-form"></div>
        </div>

        <div className="sm-section">
          <div className="sm-section-header">
            <div className="sm-skeleton-line sm-section-title"></div>
            <div className="sm-skeleton-badge"></div>
          </div>
          <div className="sm-skeleton-form"></div>
        </div>

        {/* Categories Grid Skeleton */}
        <div className="sm-section">
          <div className="sm-section-header">
            <div className="sm-skeleton-line sm-section-title"></div>
            <div className="sm-skeleton-badge"></div>
          </div>
          <div className="sm-categories-grid">
            {[...Array(4)].map((_, index) => (
              <SkeletonCategoryCard key={index} />
            ))}
          </div>
        </div>
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
            placeholder={
              activeTab === 'categories' 
                ? "Search categories..." 
                : "Search subjects..."
            }
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
            Categories ({categories.length})
          </button>
          <button 
            className={`sm-tab ${activeTab === 'subjects' ? 'sm-tab-active' : ''}`}
            onClick={() => setActiveTab('subjects')}
          >
            <FiBook />
            Subjects ({categories.reduce((total, cat) => total + cat.subjects.length, 0)})
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
          <h3>
            {activeTab === 'categories' ? 'Existing Categories' : 'All Subjects'}
          </h3>
          <div className="sm-section-badge">
            {activeTab === 'categories' 
              ? `${filteredData.length} ${filteredData.length === 1 ? 'Category' : 'Categories'}`
              : `${allSubjects.length} ${allSubjects.length === 1 ? 'Subject' : 'Subjects'}`
            }
          </div>
        </div>

        {activeTab === 'categories' ? (
          /* Categories View */
          filteredData.length === 0 ? (
            <div className="sm-empty-state">
              <FiBook className="sm-empty-icon" />
              <h3>No categories found</h3>
              <p>
                {searchTerm ? 
                  'No categories match your search. Try different keywords.' : 
                  'Get started by adding your first category above.'
                }
              </p>
            </div>
          ) : (
            <div className="sm-categories-grid">
              {filteredData.map(category => (
                <div key={category.id} className="sm-category-card">
                  <div className="sm-category-header">
                    {editingCategory === category.id ? (
                      <div className="sm-edit-form">
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          onBlur={() => handleUpdateCategory(category.id, editCategoryName)}
                          onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory(category.id, editCategoryName)}
                          autoFocus
                          className="sm-form-input sm-edit-input"
                        />
                        <div className="sm-edit-actions">
                          <button 
                            onClick={() => handleUpdateCategory(category.id, editCategoryName)}
                            className="sm-btn-save"
                          >
                            <FiSave />
                          </button>
                          <button 
                            onClick={() => {
                              setEditingCategory(null);
                              setEditCategoryName('');
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
                            onClick={() => startEditCategory(category)}
                            className="sm-btn-edit"
                            title="Edit category name"
                          >
                            <FiEdit />
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(category.id)} 
                            className="sm-btn-delete"
                            title="Delete category"
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
                          {editingSubject === subject.id ? (
                            <div className="sm-edit-form sm-subject-edit">
                              <input
                                type="text"
                                value={editSubjectName}
                                onChange={(e) => setEditSubjectName(e.target.value)}
                                onBlur={() => handleUpdateSubject(subject.id, editSubjectName)}
                                onKeyPress={(e) => e.key === 'Enter' && handleUpdateSubject(subject.id, editSubjectName)}
                                autoFocus
                                className="sm-form-input sm-edit-input"
                              />
                              <div className="sm-edit-actions">
                                <button 
                                  onClick={() => handleUpdateSubject(subject.id, editSubjectName)}
                                  className="sm-btn-save"
                                >
                                  <FiSave />
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingSubject(null);
                                    setEditSubjectName('');
                                  }}
                                  className="sm-btn-cancel"
                                >
                                  <FiX />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="sm-subject-name">{subject.name}</span>
                              <button 
                                onClick={() => startEditSubject(subject)}
                                className="sm-btn-edit sm-btn-edit-sm"
                                title="Edit subject name"
                              >
                                <FiEdit />
                              </button>
                            </>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeleteSubject(subject.id)} 
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
          )
        ) : (
          /* Subjects View */
          allSubjects.length === 0 ? (
            <div className="sm-empty-state">
              <FiBook className="sm-empty-icon" />
              <h3>No subjects found</h3>
              <p>
                {searchTerm ? 
                  'No subjects match your search. Try different keywords.' : 
                  'Get started by adding your first subject above.'
                }
              </p>
            </div>
          ) : (
            <div className="sm-subjects-grid">
              {allSubjects.map(subject => (
                <div key={subject.id} className="sm-subject-card">
                  <div className="sm-subject-card-header">
                    <FiBook className="sm-subject-card-icon" />
                    <div className="sm-subject-card-info">
                      <h4 className="sm-subject-card-name">{subject.name}</h4>
                      <span className="sm-subject-card-category">{subject.categoryName}</span>
                    </div>
                  </div>
                  <div className="sm-subject-card-actions">
                    <button 
                      onClick={() => startEditSubject(subject)}
                      className="sm-btn-edit"
                      title="Edit subject"
                    >
                      <FiEdit />
                    </button>
                    <button 
                      onClick={() => handleDeleteSubject(subject.id)}
                      className="sm-btn-delete"
                      title="Delete subject"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SubjectManagement;